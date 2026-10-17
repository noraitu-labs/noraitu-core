# 10 - Nora Native Device Capabilities (Wake Lock, Identidad y GPS)

Ubicación: `src/hooks/useNoraDeviceCapabilities.ts`

---

## 🎯 Objetivo del Parche
Optimizar la resiliencia y el confort de uso en dispositivos móviles (PWA y navegadores de celular), evitando suspensiones intempestivas del sistema operativo durante sesiones continuas de voz o de visión computacional, aportando simultáneamente cercanía humana institucional.

---

## 🛠️ Capacidades Nativas Implementadas

### 1. Screen Wake Lock API (`navigator.wakeLock`)
* **Problema que resuelve**: Los sistemas operativos móviles (Android/iOS) suspenden la pantalla y los hilos de red/audio tras unos segundos de inactividad táctil, cortando llamadas o transmisiones de video.
* **Solución**:
  * Adquisición automática de un bloqueo de pantalla activo cuando:
    * La cámara está transmitiendo (`vision.isCameraActive`).
    * El micrófono está grabando (`audio.isRecording`).
    * El modal de llamada en tiempo real está abierto (`isCallModalOpen`).
  * Re-adquisición automática ante eventos de cambio de visibilidad de la pestaña (`visibilitychange`).
  * Liberación segura del centinela (`release()`) al desmontar el componente o cerrar la sesión.

### 2. Inyección de Identidad Personalizada ("Javier")
* **Calidez institucional y humana**:
  * Se inyecta en el contexto conversacional del System Prompt (`src/lib/prompts/index.ts` y `/api/nora-inference/route.ts`).
  * Nora se dirige al usuario con naturalidad y respeto profesional sin caer en rigideces corporativas ni explicaciones técnicas.
  * El feed de bienvenida (`NoraChatFeed.tsx`) recibe el nombre para personalizar el saludo inicial:
    > *"Hola Javier, soy Nora. Asistente cognitivo multimodal de excelencia académica e institucional. Estoy aquí para acompañarte."*

### 3. Geolocalización No Bloqueante (`navigator.geolocation`)
* Captura de coordenadas GPS en segundo plano con baja precisión deliberada (`enableHighAccuracy: false`) para preservar la batería del dispositivo.
* Fallback automático a las coordenadas institucionales de **Ituzaingó, Corrientes (Sede UTN)** si el usuario no otorga permisos de GPS o está en un entorno cerrado.
