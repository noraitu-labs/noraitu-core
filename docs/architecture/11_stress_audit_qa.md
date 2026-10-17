# Informe de Auditoría de Carga, Resiliencia y QA de Sistemas Críticos en Edge AI
**Sistema:** Nora Itu Core  
**Entorno de Operación:** Edge AI / Dispositivos Móviles / PWA / Redes de Borde Inestables  
**Nivel de Severidad:** Grado de Producción Crítico  

---

## 1. Estrés en la Ventana de Contexto Deslizante (Sliding Window & DB Sync)

### Diagnóstico Estático y Simulación de Fallo (30 min / 40 interacciones rápidas)
- **Condición de Carrera en Cierres de React (`Closure Stale State`):**  
  En [useNoraChat.ts](file:///d:/Nora%20itu%20UTN/src/hooks/useNoraChat.ts#L107-L135), durante ráfagas de 40 preguntas rápidas, múltiples invocaciones asíncronas de `sendMessage` leían `state.messages` desde la clausura léxica del render anterior. Esto provocaba que `state.messages.slice(-6)` enviara mensajes obsoletos o duplicara turnos de usuario, perdiendo la sincronía del diálogo.
- **Acumulación Oculta de Tokens:**  
  Si el array crecía de forma inconsistente, el cliente enviaba el historial sin recortar adecuadamente, aumentando la latencia del LLM por encima de los 1200ms.
- **Sincronización hacia MongoDB Atlas / Neon:**  
  Las llamadas a `/api/nora-memory` y `/api/noraitu-stream` operan en modo *fire-and-forget* con `.catch(() => {})`. No bloquean el Event Loop del navegador, pero carecían de una cola atómica en memoria.

### Parche Defensivo Aplicado
Se incorporó `messagesRef` con sincronización atómica inmediata antes de disparar el fetch:
```typescript
const messagesRef = useRef<ChatMessage[]>([]);
useEffect(() => {
  messagesRef.current = state.messages;
}, [state.messages]);

// En sendMessage:
messagesRef.current = [...messagesRef.current, userMessage];
setState((prev) => ({ ...prev, messages: messagesRef.current, isLoading: true }));

// Ventana de Contexto Deslizante: lectura estricta y segura
const slidingWindowHistory = messagesRef.current.slice(-7, -1).map((m) => ({
  role: m.role,
  content: m.content,
}));
```

---

## 2. Saturación del Motor VAD WebAssembly y Permisos de Audio

### Diagnóstico Estático y Simulación de Fallo (Ruido continuo 10 min / 5 Barge-in/min)
- **Riesgo de Memory Leak en WebAssembly/ONNX Runtime:**  
  En [useNoraVAD.ts](file:///d:/Nora%20itu%20UTN/src/hooks/useNoraVAD.ts#L88-L140), la llamada dinámica `MicVAD.new(...)` reserva buffers de audio en el heap de Wasm. Si el usuario conmuta pestañas o desmonta el componente antes de que la promesa de inicialización resuelva, la instancia de `vad` quedaba huérfana reteniendo el `AudioContext` y los workers de ONNX.
- **Barge-in Repetitivo:**  
  El evento `onSpeechStart` disparaba `window.speechSynthesis.cancel()`, pero sin una guarda de montaje (`isMountedRef`), provocaba actualizaciones de estado en componentes ya desmontados (`memory leak warning`).

### Parche Defensivo Aplicado
Se agregaron guardas de inicialización y ciclo de vida de montaje (`isInitializingRef`, `isMountedRef`):
```typescript
const isInitializingRef = useRef<boolean>(false);
const isMountedRef = useRef<boolean>(true);

// En startVAD():
if (isInitializingRef.current) return;
isInitializingRef.current = true;
// ...
const vad = await MicVAD.new({ ... });
if (!isMountedRef.current) {
  vad.destroy(); // Destrucción inmediata si se desmontó mientras cargaba
  return;
}
myvadRef.current = vad;
```

---

## 3. Falla Crítica de Visión y Latencia en Modo Lazarillo

### Diagnóstico Estático y Simulación de Fallo (30 FPS / Baja Luz / Movimiento Brusco)
- **Colisión de Bucle y Congelamiento de Canvas:**  
  En [useNoraVision.ts](file:///d:/Nora%20itu%20UTN/src/hooks/useNoraVision.ts#L368-L445), ráfagas a 30 FPS invocaban `captureAndAnalyze` concurrentemente. Si la inferencia de COCO-SSD o la telemetría tardaban 150ms, múltiples llamadas a `ctx.getImageData` y `canvas.toDataURL` competían en el hilo principal de la UI, provocando caídas de cuadros y congelamiento del `<video>`.
- **Alerta Reflexiva vs Stream de Red:**  
  La alerta reflexiva de 0ms opera localmente vía `window.speechSynthesis` con un cooldown acústico de 2500ms, evitando la saturación de habla.

### Parche Defensivo Aplicado
Se incorporó una guarda de descarte de fotogramas (*frame-dropping*) no bloqueante:
```typescript
if (state.isProcessing) {
  return {
    imageBase64: state.lastSnapshotBase64,
    telemetry: state.telemetry,
    alerts: state.alerts,
    formattedSummary: state.telemetry?.summaryText || "Procesando fotograma en curso...",
    criticalHazard: state.criticalHazardDetected,
  };
}
setState((prev) => ({ ...prev, isProcessing: true }));
```

---

## 4. Resiliencia de la Screen Wake Lock API y Visibilidad de la PWA

### Diagnóstico Estático y Simulación de Fallo (Minimización / Llamadas Entrantes)
- **Falla por `InvalidStateError` en `visibilitychange`:**  
  En [useNoraDeviceCapabilities.ts](file:///d:/Nora%20itu%20UTN/src/hooks/useNoraDeviceCapabilities.ts#L55-L115), si el sistema operativo enviaba múltiples eventos `visibilitychange` o el documento aún no estaba completamente visible (`document.visibilityState !== "visible"`), `navigator.wakeLock.request('screen')` lanzaba excepciones no capturadas.
- **Riesgo de Terminación por OS:**  
  Cuando el navegador móvil suspende la pestaña, el Wake Lock es revocado automáticamente por el SO. Al volver a primer plano, es mandatorio verificar que no haya una solicitud en vuelo.

### Parche Defensivo Aplicado
Se añadió control de estado de visibilidad y flag de adquisición en vuelo:
```typescript
const isAcquiringWakeLockRef = useRef<boolean>(false);

const requestWakeLock = useCallback(async (): Promise<boolean> => {
  if (
    typeof window === "undefined" ||
    !("wakeLock" in navigator) ||
    document.visibilityState !== "visible"
  ) {
    return false;
  }
  if (isAcquiringWakeLockRef.current) return false;
  try {
    isAcquiringWakeLockRef.current = true;
    // ... request and attach release listener
  } finally {
    isAcquiringWakeLockRef.current = false;
  }
}, []);
```

---

## 5. Degradación por Pérdida Total de Red (Modo Híbrido Offline/Online)

### Diagnóstico Estático y Simulación de Fallo (Corte Abrupto de Wi-Fi Mid-Query)
- **Manejo de Excepciones Limpias:**  
  Al caerse la red, `fetch` lanza `TypeError: Failed to fetch`. En `useNoraChat.ts` se añadió detección de `!navigator.onLine` para informar al usuario de inmediato sin romper la UI ni dejar la aplicación en estado de carga infinita (`isLoading: false`).
- **Autonomía de Capas Locales:**  
  - Modo Lazarillo continúa ejecutando la alerta reflexiva (0ms) en el cliente gracias a la síntesis nativa y análisis del canvas.
  - VAD y Web Speech continúan escuchando y alertando de forma local sin depender de Vercel ni Groq.
