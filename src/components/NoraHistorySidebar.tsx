"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  X,
  Clock,
  Sparkles,
  Phone,
  Mail,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export interface SessionItem {
  sessionId: string;
  updatedAt: string | Date;
  lastMessageSnippet: string;
  messageCount: number;
}

interface NoraHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export function NoraHistorySidebar({
  isOpen,
  onClose,
  currentSessionId,
  onSelectSession,
  onNewChat,
}: NoraHistorySidebarProps) {
  const [sessions, setSessions] = useState<SessionItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("nora_sessions_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn("[NoraHistorySidebar] Error leyendo nora_sessions_cache:", e);
      }
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cargar lista de sesiones desde la API y guardar en localStorage
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/nora-memory?mode=sessions&limit=35");
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("nora_sessions_cache", JSON.stringify(data.sessions));
            } catch (e) {
              console.warn("[NoraHistorySidebar] Error guardando nora_sessions_cache:", e);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[NoraHistorySidebar] Error al cargar sesiones:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar sesiones al montar el componente (incluso antes de abrir la solapa) y al abrirla
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  // Eliminar una conversación
  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    if (!confirm("¿Deseas eliminar esta conversación del historial?")) return;

    setDeletingId(sid);
    try {
      const res = await fetch(`/api/nora-memory?sessionId=${encodeURIComponent(sid)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.sessionId !== sid));
        if (sid === currentSessionId) {
          onNewChat();
        }
      }
    } catch (err) {
      console.warn("[NoraHistorySidebar] Error al eliminar sesión:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatTimestamp = (dateInput: string | Date) => {
    try {
      const d = new Date(dateInput);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      if (diffDays === 1) {
        return "Ayer";
      }
      if (diffDays < 7) {
        return `Hace ${diffDays}d`;
      }
      return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <>
      {/* Backdrop con desenfoque de cristal para cuando la solapa está abierta */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 z-40 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Panel lateral deslizante solapado a la izquierda (Estilo ChatGPT / Claude Pro) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-slate-950/95 backdrop-blur-xl border-r border-white/10 shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-out transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
        }}
        aria-label="Historial de conversaciones"
      >
        {/* CABECERA DE LA SOLAPA */}
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <MessageSquare size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                Historial de Chats
              </div>
              <div className="text-[10px] text-slate-400">Sesiones cognitivas guardadas</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Cerrar panel"
            aria-label="Cerrar historial"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* BOTÓN NUEVO CHAT (ESTILO TOP MUNDIAL) */}
        <div className="p-3 shrink-0">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-900/30 transition-all border border-indigo-400/20 active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Nueva Conversación</span>
          </button>
        </div>

        {/* LISTA DESPLAZABLE DE CONVERSACIONES */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 min-h-0">
          {isLoading && sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Sincronizando historial...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <MessageSquare size={28} className="mx-auto mb-2 text-slate-600" />
              <p className="text-xs font-medium text-slate-300">Sin conversaciones previas</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Tus consultas y análisis se guardarán automáticamente aquí.
              </p>
            </div>
          ) : (
            sessions.map((item) => {
              const isActive = item.sessionId === currentSessionId;
              const isDeleting = deletingId === item.sessionId;

              return (
                <div
                  key={item.sessionId}
                  onClick={() => {
                    onSelectSession(item.sessionId);
                    onClose();
                  }}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isActive
                      ? "bg-indigo-600/15 border-indigo-500/40 text-white shadow-xs"
                      : "border-transparent hover:bg-slate-900/60 hover:border-white/5 text-slate-300"
                  } ${isDeleting ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <MessageSquare
                      size={14}
                      className={isActive ? "text-indigo-400 shrink-0" : "text-slate-500 group-hover:text-slate-400 shrink-0"}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate leading-tight">
                        {item.lastMessageSnippet || "Conversación"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Clock size={10} />
                        <span>{formatTimestamp(item.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botón eliminar sesión */}
                  <button
                    onClick={(e) => handleDeleteSession(e, item.sessionId)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                    title="Eliminar conversación"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* PIE DE FIRMA DE AUTOR PROFESIONAL: NEXORA ONE */}
        <div className="p-3 border-t border-white/10 bg-slate-900/70 shrink-0">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 shadow-inner">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wide">Nexora One</span>
              </div>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                Autor
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight mb-2">
              Ingeniería e Innovación en Asistencia Cognitiva Multimodal
            </p>

            <div className="space-y-1 pt-1.5 border-t border-white/5 text-[11px]">
              <a
                href="tel:3786414533"
                className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors"
                title="Llamar o escribir"
              >
                <Phone size={12} className="text-emerald-400 shrink-0" />
                <span className="font-mono">3786414533</span>
              </a>

              <a
                href="mailto:mjnexora.visual@gmail.com"
                className="flex items-center gap-2 text-slate-300 hover:text-indigo-400 transition-colors truncate"
                title="Enviar correo"
              >
                <Mail size={12} className="text-indigo-400 shrink-0" />
                <span className="truncate font-mono">mjnexora.visual@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default NoraHistorySidebar;
