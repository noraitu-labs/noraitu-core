/**
 * audioUtils.ts: Utilidades de Sanitización y Normalización Fonética para Síntesis de Voz (TTS).
 * 
 * Intercepta y normaliza operadores matemáticos, símbolos y secuencias científicas
 * para que el sintetizador de voz (SpeechSynthesis) lea de forma natural y accesible (a11y),
 * sin alterar la presentación visual en la interfaz de usuario.
 */

export function sanitizeForTTS(text: string): string {
  if (!text) return "";

  let sanitized = text;

  // 1. Eliminar artefactos de formateo, markdown y bloques internos de pensamiento
  sanitized = sanitized
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/^Thinking:?\s*/i, "")
    .replace(/```[\s\S]*?```/g, "") // Bloques de código
    .replace(/`([^`]+)`/g, "$1")     // Código inline
    .replace(/[*#_~`>\[\]\(\)\{\}\\]+/g, " "); // Símbolos de markdown

  // 2. Normalización de Operadores Matemáticos entre números (ej. 5 x 5 -> 5 por 5)
  // Multiplicación: número [xX*×·] número
  sanitized = sanitized.replace(/(\d+)\s*[xX*×·]\s*(\d+)/g, "$1 por $2");

  // Suma: número + número (o expresión con suma)
  sanitized = sanitized.replace(/(\d+)\s*\+\s*(\d+)/g, "$1 más $2");

  // Resta: número - número (con espacios o directo entre dígitos)
  sanitized = sanitized.replace(/(\d+)\s*[-–—]\s*(\d+)/g, "$1 menos $2");

  // División: número [/÷%] número
  sanitized = sanitized.replace(/(\d+)\s*[\/÷]\s*(\d+)/g, "$1 dividido $2");

  // Porcentaje como módulo o división: 10 % 2 -> 10 dividido 2
  sanitized = sanitized.replace(/(\d+)\s*%\s*(\d+)/g, "$1 dividido $2");

  // Porcentaje clásico al final de un número (ej. 50% -> 50 por ciento)
  sanitized = sanitized.replace(/(\d+)\s*%/g, "$1 por ciento");

  // Igualdad: número = número o término = término
  sanitized = sanitized.replace(/(\d+)\s*=\s*(\d+)/g, "$1 es igual a $2");
  sanitized = sanitized.replace(/\s*=\s*/g, " es igual a ");

  // Desigualdades y comparadores
  sanitized = sanitized.replace(/(\d+)\s*>\s*(\d+)/g, "$1 mayor que $2");
  sanitized = sanitized.replace(/(\d+)\s*<\s*(\d+)/g, "$1 menor que $2");
  sanitized = sanitized.replace(/(\d+)\s*≥\s*(\d+)/g, "$1 mayor o igual que $2");
  sanitized = sanitized.replace(/(\d+)\s*≤\s*(\d+)/g, "$1 menor o igual que $2");
  sanitized = sanitized.replace(/(\d+)\s*≠\s*(\d+)/g, "$1 distinto de $2");

  // Potencias simples (ej. 2^3 -> 2 elevado a la 3)
  sanitized = sanitized.replace(/(\d+)\s*\^\s*(\d+)/g, "$1 elevado a la $2");

  // 3. Normalizar espacios en blanco consecutivos y saltos
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}
