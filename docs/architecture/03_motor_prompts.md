# 03 - Motor de Prompts y Personalidad Centralizado

Ubicación: `src/lib/prompts/index.ts`

---

## 🎯 Por qué centralizar los Prompts
Anteriormente, las directivas estaban hardcodeadas en strings dispersos entre `route.ts`, `page.tsx` y `NoraRealtimeCallModal.tsx`. Cualquier cambio de tono o corrección generaba desincronización y riesgo de respuestas robóticas.

---

## 🎭 Perfiles de Comportamiento Tipados

### 1. Directiva Base (`BASE_SYSTEM_DIRECTIVE`)
* **Arquetipo**: Recepcionista o anfitriona ejecutiva de hotel cinco estrellas de clase mundial.
* **Idioma**: Español Neutro Latinoamericano impecable (`"tienes"`, `"puedes"`, `"con mucho gusto"`).
* **Restricción de Robótica**: Cero discursos defensivos sobre OpenAI o limitaciones de IA. Presentación directa:
  > *"Soy Nora, asistente de Nexora One, y estoy aquí para acompañarte y facilitarte lo que necesites."*
* **Formato Oral**: Textos concisos, dinámicos y limpios de asteriscos (`**`) o hashtags (`#`) que traban el sintetizador de voz.

### 2. Módulo TEA (`INCLUSIVE_TEA_DIRECTIVE`)
* Lenguaje 100% literal (cero sarcasmos, metáforas ni ambigüedades).
* Respuestas secuenciadas paso a paso (Paso 1, Paso 2) con una sola tarea por paso.
* Opciones binarias acotadas ante situaciones de sobrecarga.

### 3. Módulo Lazarillo / No Videntes (`INCLUSIVE_BLIND_DIRECTIVE`)
* Coordenadas obligatorias de la esfera del reloj relativas al cuerpo del usuario: `a tus 12`, `a tus 2`, `a tus 10`, `a tus 9`.
* Estimación de distancias reales en metros y pasos.
* Advertencia prioritaria inmediata de desniveles, escalones y obstáculos en el suelo.

---

## 🧩 Compilador `compileNoraPrompt(context)`
Función pura que recibe el modo activo, la telemetría sensorial en tiempo real y la ubicación, generando el payload compilado listo para el modelo:

```ts
const { fullCompiledDirective } = compileNoraPrompt({
  mode: "lazarillo",
  visualTelemetry: "Paso frontal a las 12 libre. Silla a tus 2 en punto a 1.5 metros.",
  clientDateTime: "17/10/2026, 12:00:00",
});
```
