"use client";

import { useEffect } from "react";

/**
 * Blindaje Antirrobo e Inspección en el Cliente (useSecurityLockdown)
 * Se activa estrictamente cuando process.env.NODE_ENV === 'production'
 * 
 * Acciones:
 * 1. Previene el menú contextual (clic derecho)
 * 2. Bloquea atajos de teclado de DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, etc.)
 * 3. Deshabilita la extensión React DevTools anulando __REACT_DEVTOOLS_GLOBAL_HOOK__
 */
export function useSecurityLockdown() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    // 1. Deshabilitar React DevTools Extension Hook
    try {
      if (typeof window !== "undefined") {
        const win = window as any;
        if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          win.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = () => {};
          Object.keys(win.__REACT_DEVTOOLS_GLOBAL_HOOK__).forEach((key) => {
            if (typeof win.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] === "function") {
              win.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = () => {};
            }
          });
        }
      }
    } catch {
      // Ignorar errores de sandbox
    }

    // 2. Interceptar y prevenir menú contextual (clic derecho)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 3. Interceptar y prevenir atajos de DevTools e inspección de código
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I (Inspect) o Cmd+Alt+I (Mac)
      // Ctrl+Shift+J (Console) o Cmd+Alt+J (Mac)
      // Ctrl+Shift+C (Element picker)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "I" ||
          e.key === "i" ||
          e.key === "J" ||
          e.key === "j" ||
          e.key === "C" ||
          e.key === "c")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U (Ver código fuente) o Cmd+Option+U
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "U" || e.key === "u")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S (Prevenir guardar código HTML del cliente)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "S" || e.key === "s")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);
}
