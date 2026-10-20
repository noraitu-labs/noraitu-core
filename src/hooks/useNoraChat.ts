"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type NoraMode = "general" | "tea" | "lazarillo" | "docente" | "no_videntes";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  imageBase64?: string | null;
  spatialAlerts?: any[];
  mode?: NoraMode;
}

export interface UseNoraChatOptions {
  sessionId?: string;
  initialMode?: NoraMode;
  agentId?: string;
}

export interface NoraChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  activeMode: NoraMode;
  error: string | null;
  currentResponseStream: string;
}

/**
 * useNoraChat: Hook desacoplado para orquestar el flujo conversacional.
 * Maneja el streaming progresivo de tokens, el almacenamiento local reactivo
 * y la persistencia asíncrona fire-and-forget (MongoDB + Neon) sin bloquear la UI.
 */
export function useNoraChat(options: UseNoraChatOptions = {}) {
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    if (options.sessionId) return options.sessionId;
    if (typeof window !== "undefined") {
      let saved = localStorage.getItem("nora_session_id");
      if (!saved) {
        saved = `nora_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem("nora_session_id", saved);
      }
      return saved;
    }
    return "anonymous";
  });

  const initialMode = options.initialMode || "general";
  const agentId = options.agentId || "nora-itu";

  const [state, setState] = useState<NoraChatState>(() => {
    let initialMessages: ChatMessage[] = [];
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("nora_history_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            initialMessages = parsed;
          }
        }
      } catch (e) {
        console.warn("[useNoraChat] Error leyendo nora_history_cache:", e);
      }
    }
    return {
      messages: initialMessages,
      isLoading: false,
      isStreaming: false,
      activeMode: initialMode,
      error: null,
      currentResponseStream: "",
    };
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sincronizar siempre los mensajes con localStorage para que al recargar la PWA no se pierdan
  useEffect(() => {
    if (typeof window !== "undefined" && state.messages.length > 0) {
      try {
        localStorage.setItem("nora_history_cache", JSON.stringify(state.messages));
      } catch (e) {
        console.warn("[useNoraChat] Error guardando nora_history_cache:", e);
      }
    }
  }, [state.messages]);

  // Cargar historial de MongoDB cuando cambia currentSessionId
  const loadMemoryForSession = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/nora-memory?sessionId=${encodeURIComponent(sid)}&limit=30&agentId=${agentId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        const loaded: ChatMessage[] = data.messages.map((m: any, idx: number) => ({
          id: m._id || `mem-${idx}-${Date.now()}`,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp || new Date().toISOString(),
          mode: m.mode || "general",
        }));
        setState((prev) => ({ ...prev, messages: loaded, currentResponseStream: "" }));
        if (typeof window !== "undefined") {
          localStorage.setItem("nora_history_cache", JSON.stringify(loaded));
        }
      }
    } catch (err) {
      console.warn("[useNoraChat] No se pudo cargar memoria:", err);
    }
  }, [agentId]);

  useEffect(() => {
    loadMemoryForSession(currentSessionId);
  }, [currentSessionId, loadMemoryForSession]);

  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = state.messages;
  }, [state.messages]);

  // Cambiar modo activo
  const setMode = useCallback((newMode: NoraMode) => {
    setState((prev) => ({ ...prev, activeMode: newMode }));
  }, []);

  // Enviar mensaje con soporte multimodal y telemetría óptica
  const sendMessage = useCallback(
    async (params: {
      text: string;
      userName?: string;
      imageBase64?: string | null;
      visualTelemetry?: string | null;
      deviceLocation?: any;
    }): Promise<string | null> => {
      const { text, userName = "Javier", imageBase64 = null, visualTelemetry = null, deviceLocation = null } = params;

      if (!text.trim() && !imageBase64) return null;

      const userMsgId = `usr-${Date.now()}`;
      const userMessage: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
        imageBase64: imageBase64 ? imageBase64 : null,
        mode: state.activeMode,
      };

      // Actualización funcional atómica y sincronización inmediata con messagesRef
      messagesRef.current = [...messagesRef.current, userMessage];
      setState((prev) => ({
        ...prev,
        messages: messagesRef.current,
        isLoading: true,
        isStreaming: true,
        currentResponseStream: "",
        error: null,
      }));

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // VENTANA DE CONTEXTO DESLIZANTE (SLIDING WINDOW):
        // Lee directamente desde messagesRef.current para garantizar que nunca sea stale en ráfagas concurrentes.
        // Mantiene estrictamente los últimos 6 a 8 mensajes activos en el prompt para asegurar latencia < 400ms.
        const slidingWindowHistory = messagesRef.current.slice(-7, -1).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const payload = {
          sessionId: currentSessionId,
          userText: text,
          userName,
          imageBase64,
          visualTelemetry,
          mode: state.activeMode,
          deviceLocation,
          clientDateTime: new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
          history: slidingWindowHistory,
        };

        const response = await fetch("/api/nora-inference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Error en el motor de inferencia: HTTP ${response.status}`);
        }

        let fullAssistantText = "";

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let done = false;

          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              fullAssistantText += chunk;
              setState((prev) => ({
                ...prev,
                currentResponseStream: fullAssistantText,
              }));
            }
          }
        } else {
          const data = await response.json();
          fullAssistantText = data.text || data.response || "";
        }

        const cleanAssistantText = fullAssistantText
          .replace(/^Thinking:?\s*/i, "")
          .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
          .trim();

        const assistantMsgId = `asst-${Date.now()}`;
        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: "assistant",
          content: cleanAssistantText,
          timestamp: new Date().toISOString(),
          mode: state.activeMode,
        };

        messagesRef.current = [...messagesRef.current, assistantMessage];
        setState((prev) => ({
          ...prev,
          messages: messagesRef.current,
          isLoading: false,
          isStreaming: false,
          currentResponseStream: "",
        }));

        // Sincronización asíncrona fire-and-forget con Neon y MongoDB (no bloquea el hilo principal)
        fetch("/api/noraitu-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: currentSessionId,
            userMessage: text,
            assistantResponse: cleanAssistantText,
            hasImage: Boolean(imageBase64),
          }),
        }).catch(() => {});

        fetch("/api/nora-memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: currentSessionId,
            agentId,
            userMessage: text,
            assistantResponse: cleanAssistantText,
            imageBase64,
            mode: state.activeMode,
          }),
        }).catch(() => {});

        return cleanAssistantText;
      } catch (err: any) {
        if (err.name === "AbortError") {
          return null;
        }
        console.error("[useNoraChat] Error en streaming/inferencia:", err);
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: isOffline
            ? "Sin conexión a internet. Los módulos locales continúan activos."
            : "Ocurrió una interrupción de conexión con el motor de inferencia.",
        }));
        return null;
      }
    },
    [currentSessionId, agentId, state.activeMode]
  );

  // Iniciar un nuevo chat vacío guardando la sesión actual en nora_sessions_cache
  const startNewChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 1. Verificar si hay mensajes útiles en la conversación activa antes de limpiar
    const currentMessages = messagesRef.current;
    const usefulMessages = currentMessages.filter((m) => m.content && m.content.trim().length > 0);

    if (usefulMessages.length > 0 && typeof window !== "undefined") {
      try {
        const firstUserMsg = usefulMessages.find((m) => m.role === "user");
        const snippet = firstUserMsg
          ? firstUserMsg.content.slice(0, 48)
          : usefulMessages[0].content.slice(0, 48);

        const newSessionItem = {
          sessionId: currentSessionId,
          updatedAt: new Date().toISOString(),
          lastMessageSnippet: snippet,
          messageCount: usefulMessages.length,
        };

        const existingRaw = localStorage.getItem("nora_sessions_cache");
        let sessionList: any[] = [];
        if (existingRaw) {
          try {
            sessionList = JSON.parse(existingRaw);
          } catch {}
        }

        // Evitar duplicados y colocar la sesión al principio
        sessionList = [newSessionItem, ...sessionList.filter((s) => s.sessionId !== currentSessionId)];
        localStorage.setItem("nora_sessions_cache", JSON.stringify(sessionList));
        window.dispatchEvent(new Event("nora_sessions_updated"));
      } catch (err) {
        console.warn("[useNoraChat] Error al auto-guardar sesión previa:", err);
      }
    }

    const newSid = `nora_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (typeof window !== "undefined") {
      localStorage.setItem("nora_session_id", newSid);
      localStorage.removeItem("nora_history_cache");
    }

    setCurrentSessionId(newSid);
    setState((prev) => ({
      ...prev,
      messages: [],
      currentResponseStream: "",
      error: null,
      isLoading: false,
      isStreaming: false,
    }));
  }, [currentSessionId]);

  // Cambiar a una conversación anterior
  const switchSession = useCallback((targetSessionId: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("nora_session_id", targetSessionId);
    }
    setCurrentSessionId(targetSessionId);
    setState((prev) => ({
      ...prev,
      messages: [],
      currentResponseStream: "",
      error: null,
      isLoading: false,
      isStreaming: false,
    }));
  }, []);

  // Limpiar conversación actual
  const clearChat = useCallback(() => {
    const currentMessages = messagesRef.current;
    if (currentMessages.length > 0 && typeof window !== "undefined") {
      try {
        const firstUserMsg = currentMessages.find((m) => m.role === "user");
        const snippet = firstUserMsg
          ? firstUserMsg.content.slice(0, 48)
          : currentMessages[0].content.slice(0, 48);

        const newSessionItem = {
          sessionId: currentSessionId,
          updatedAt: new Date().toISOString(),
          lastMessageSnippet: snippet,
          messageCount: currentMessages.length,
        };

        const existingRaw = localStorage.getItem("nora_sessions_cache");
        let sessionList: any[] = [];
        if (existingRaw) {
          try {
            sessionList = JSON.parse(existingRaw);
          } catch {}
        }
        sessionList = [newSessionItem, ...sessionList.filter((s) => s.sessionId !== currentSessionId)];
        localStorage.setItem("nora_sessions_cache", JSON.stringify(sessionList));
        localStorage.removeItem("nora_history_cache");
        window.dispatchEvent(new Event("nora_sessions_updated"));
      } catch (err) {
        console.warn("[useNoraChat] Error guardando sesión en clearChat:", err);
      }
    }

    setState((prev) => ({
      ...prev,
      messages: [],
      currentResponseStream: "",
      error: null,
    }));
  }, [currentSessionId]);

  return {
    ...state,
    sessionId: currentSessionId,
    setMode,
    sendMessage,
    clearChat,
    startNewChat,
    switchSession,
  };
}
