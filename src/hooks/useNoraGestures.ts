"use client";

import { useEffect, useRef } from "react";

interface UseNoraGesturesOptions {
  onTriggerLazarillo: () => void;
  enabled?: boolean;
}

/**
 * useNoraGestures: Hook de Accesibilidad Física y Háptica para Personas No Videntes.
 * 
 * Capas de Detección:
 * 1. Shake Detection (DeviceMotionEvent):
 *    Detecta si el usuario sacude físicamente el dispositivo 3 veces consecutivas con suficiente aceleración.
 * 2. Long Press (Toque Sostenido de 3 segundos):
 *    Permite al usuario presionar y sostener cualquier área de la pantalla durante 3000ms.
 */
export function useNoraGestures({
  onTriggerLazarillo,
  enabled = true,
}: UseNoraGesturesOptions) {
  const onTriggerRef = useRef(onTriggerLazarillo);
  useEffect(() => {
    onTriggerRef.current = onTriggerLazarillo;
  }, [onTriggerLazarillo]);

  // 1. Detección de Sacudida Física (DeviceMotionEvent - 3 shakes)
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let shakeCount = 0;
    let lastShakeTime = 0;
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    let hasInitialized = false;

    const SHAKE_THRESHOLD = 15; // Umbral de aceleración intencional (m/s²)
    const SHAKE_WINDOW_MS = 1200; // Ventana para registrar los 3 movimientos
    const COOLDOWN_BETWEEN_SHAKES_MS = 200; // Evita registrar el mismo movimiento dos veces

    const handleMotion = (event: DeviceMotionEvent) => {
      const current = event.accelerationIncludingGravity || event.acceleration;
      if (!current || current.x === null || current.y === null || current.z === null) {
        return;
      }

      const x = current.x;
      const y = current.y;
      const z = current.z;

      if (!hasInitialized) {
        lastX = x;
        lastY = y;
        lastZ = z;
        hasInitialized = true;
        return;
      }

      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);
      const totalDelta = deltaX + deltaY + deltaZ;

      const now = Date.now();

      if (totalDelta > SHAKE_THRESHOLD) {
        if (now - lastShakeTime > COOLDOWN_BETWEEN_SHAKES_MS) {
          // Si el último shake fue hace mucho tiempo, reiniciar contador
          if (now - lastShakeTime > SHAKE_WINDOW_MS) {
            shakeCount = 1;
          } else {
            shakeCount += 1;
          }

          lastShakeTime = now;

          // 3 sacudidas intencionales detectadas
          if (shakeCount >= 3) {
            shakeCount = 0;
            // Feedback háptico nativo si el dispositivo lo soporta
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              try {
                navigator.vibrate([100, 50, 200]);
              } catch {}
            }
            onTriggerRef.current();
          }
        }
      }

      lastX = x;
      lastY = y;
      lastZ = z;
    };

    // Solicitar permiso en iOS 13+ si es necesario
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      // En iOS se disparará con el primer gesto táctil
      const requestIOSPermission = () => {
        (DeviceMotionEvent as any)
          .requestPermission()
          .then((response: string) => {
            if (response === "granted") {
              window.addEventListener("devicemotion", handleMotion);
            }
          })
          .catch(() => {});
        window.removeEventListener("touchstart", requestIOSPermission);
      };
      window.addEventListener("touchstart", requestIOSPermission, { once: true });
    } else if (typeof window !== "undefined") {
      window.addEventListener("devicemotion", handleMotion);
    }

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [enabled]);

  // 2. Detección de Toque Sostenido (Long Press de 3 segundos en cualquier parte de la pantalla)
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: NodeJS.Timeout | null = null;

    const startTimer = (e: TouchEvent | MouseEvent) => {
      // Ignorar si el usuario está interactuando con controles interactivos específicos (inputs, botones normales)
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      timer = setTimeout(() => {
        // Feedback háptico de confirmación
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate([200, 100, 300]);
          } catch {}
        }
        onTriggerRef.current();
      }, 3000);
    };

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    window.addEventListener("touchstart", startTimer, { passive: true });
    window.addEventListener("touchend", clearTimer, { passive: true });
    window.addEventListener("touchcancel", clearTimer, { passive: true });
    window.addEventListener("mousedown", startTimer);
    window.addEventListener("mouseup", clearTimer);
    window.addEventListener("mouseleave", clearTimer);

    return () => {
      clearTimer();
      window.removeEventListener("touchstart", startTimer);
      window.removeEventListener("touchend", clearTimer);
      window.removeEventListener("touchcancel", clearTimer);
      window.removeEventListener("mousedown", startTimer);
      window.removeEventListener("mouseup", clearTimer);
      window.removeEventListener("mouseleave", clearTimer);
    };
  }, [enabled]);
}
