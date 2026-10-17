# 05 - Capa de Presentación: Page.tsx

Ubicación: `src/app/page.tsx`

---

## 📉 De Monolito a Capa de Orquestación Pura

Antes de la refactorización:
* Más de 2,150 líneas de código en un solo archivo.
* Mezcla de bucles de audio, listeners de WebRTC, carga de librerías externas de TensorFlow, llamadas directas a APIs de Groq, cálculos de luminancia y lógica de persistencia.

Después de la refactorización:
* **~500 líneas limpias y legibles**.
* Cero manipulación directa de streams de audio o video.
* Reducción del First Load JS bundle de la ruta principal a **20.9 kB** (optimizada para dispositivos móviles y conexiones de baja velocidad).

---

## 🧩 Integración de Hooks en `NoraPage`

```tsx
export default function NoraPage() {
  // Consumo limpio de los 3 hooks desacoplados
  const vision = useNoraVision();
  const audio = useNoraAudio();
  const chat = useNoraChat({ initialMode: "general" });

  const handleSend = async () => {
    let visualTelemetryPayload = null;
    let imagePayload = selectedImageBase64;

    if (vision.isCameraActive) {
      const snap = await vision.captureAndAnalyze();
      imagePayload = snap.imageBase64;
      visualTelemetryPayload = snap.formattedSummary;
    }

    const reply = await chat.sendMessage({
      text: inputText,
      imageBase64: imagePayload,
      visualTelemetry: visualTelemetryPayload,
    });

    if (reply && chat.activeMode === "lazarillo") {
      audio.speakText(reply);
    }
  };

  // ... Renderizado visual reactivo de chat, barra de entrada y feed
}
```

---

## 🛡️ Guía para Desarrolladores Nuevos
1. **Para modificar el comportamiento del chat**: Editar `src/hooks/useNoraChat.ts` o `src/lib/prompts/index.ts`. No tocar `page.tsx`.
2. **Para mejorar la visión o agregar nuevos modelos locales de IA**: Editar `src/hooks/useNoraVision.ts`.
3. **Para cambiar el motor de síntesis de voz o reconocimiento**: Modificar `src/hooks/useNoraAudio.ts`.
4. `page.tsx` sólo debe modificarse cuando cambie la experiencia visual o el diseño de componentes en pantalla.
