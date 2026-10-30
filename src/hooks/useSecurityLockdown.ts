"use client";

import { useEffect } from "react";

/**
 * useSecurityLockdown
 * Bloqueo de DevTools e inspección desactivado a pedido para permitir inspección y depuración
 * tanto en desarrollo como en producción.
 */
export function useSecurityLockdown() {
  useEffect(() => {
    // Bloqueos de teclado (F12, Ctrl+Shift+I, Ctrl+Shift+J) y menú contextual (clic derecho)
    // DESACTIVADOS para permitir depuración e inspección completa en cabina.
  }, []);
}
