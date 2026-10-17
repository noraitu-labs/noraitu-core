"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface DeviceLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  province?: string;
  country?: string;
  timestamp?: number;
}

export interface UseNoraDeviceCapabilitiesOptions {
  userName?: string;
  autoRequestWakeLock?: boolean;
  enableGeolocation?: boolean;
}

export interface NoraDeviceCapabilitiesState {
  isWakeLockActive: boolean;
  isWakeLockSupported: boolean;
  userName: string;
  location: DeviceLocationData | null;
  locationError: string | null;
}

/**
 * useNoraDeviceCapabilities: Hook para potenciar la experiencia en dispositivos móviles (PWA/Browser).
 * 
 * Prestaciones:
 * 1. Screen Wake Lock API: Impide que la pantalla del celular se apague/suspenda durante llamadas en vivo o uso de cámara.
 * 2. Inyección de Identidad del Usuario: Personalización con calidez humana e institucional ("Javier").
 * 3. Geolocalización No Bloqueante: Aporte de coordenadas y contexto regional automatizado.
 */
export function useNoraDeviceCapabilities(options: UseNoraDeviceCapabilitiesOptions = {}) {
  const {
    userName: initialUserName = "Javier",
    autoRequestWakeLock = false,
    enableGeolocation = true,
  } = options;

  const [state, setState] = useState<NoraDeviceCapabilitiesState>({
    isWakeLockActive: false,
    isWakeLockSupported: false,
    userName: initialUserName,
    location: null,
    locationError: null,
  });

  const wakeLockSentinelRef = useRef<any>(null);
  const isAcquiringWakeLockRef = useRef<boolean>(false);

  // 1. GESTIÓN DE SCREEN WAKE LOCK API
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
      if (wakeLockSentinelRef.current && !wakeLockSentinelRef.current.released) {
        return true;
      }

      isAcquiringWakeLockRef.current = true;
      const sentinel = await (navigator as any).wakeLock.request("screen");
      wakeLockSentinelRef.current = sentinel;

      sentinel.addEventListener("release", () => {
        wakeLockSentinelRef.current = null;
        setState((prev) => ({ ...prev, isWakeLockActive: false }));
      });

      setState((prev) => ({ ...prev, isWakeLockActive: true }));
      return true;
    } catch (err: any) {
      console.warn("[useNoraDeviceCapabilities] WakeLock no adquirido:", err?.message || err);
      setState((prev) => ({ ...prev, isWakeLockActive: false }));
      return false;
    } finally {
      isAcquiringWakeLockRef.current = false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current && !wakeLockSentinelRef.current.released) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch (err) {
        console.warn("[useNoraDeviceCapabilities] Error al liberar WakeLock:", err);
      }
      wakeLockSentinelRef.current = null;
    }
    setState((prev) => ({ ...prev, isWakeLockActive: false }));
  }, []);

  // Verificar soporte y auto-adquisición condicional de WakeLock
  useEffect(() => {
    const isSupported = typeof window !== "undefined" && "wakeLock" in navigator;
    setState((prev) => ({ ...prev, isWakeLockSupported: isSupported }));

    if (autoRequestWakeLock && isSupported) {
      requestWakeLock().catch(() => {});
    }

    // Re-adquirir WakeLock si el usuario minimizó y volvió a la pestaña activa
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && autoRequestWakeLock) {
        requestWakeLock().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock().catch(() => {});
    };
  }, [autoRequestWakeLock, requestWakeLock, releaseWakeLock]);

  // 2. CAPTURA DE GEOLOCALIZACIÓN NO BLOQUEANTE
  const refreshLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState((prev) => ({
        ...prev,
        locationError: "Geolocalización no soportada en este navegador.",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: DeviceLocationData = {
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy),
          city: "Ituzaingó",
          province: "Corrientes",
          country: "Argentina",
          timestamp: pos.timestamp,
        };
        setState((prev) => ({ ...prev, location: coords, locationError: null }));
      },
      (err) => {
        console.warn("[useNoraDeviceCapabilities] Ubicación GPS no disponible:", err.message);
        setState((prev) => ({
          ...prev,
          locationError: err.message,
          // Coordenadas institucionales base de Ituzaingó, Corrientes (Sede UTN)
          location: {
            latitude: -27.5833,
            longitude: -56.6833,
            accuracy: 10,
            city: "Ituzaingó",
            province: "Corrientes",
            country: "Argentina",
          },
        }));
      },
      {
        enableHighAccuracy: false, // Optimizado para ahorro de batería
        timeout: 6000,
        maximumAge: 120000,
      }
    );
  }, []);

  useEffect(() => {
    if (enableGeolocation) {
      refreshLocation();
    }
  }, [enableGeolocation, refreshLocation]);

  // 3. ACTUALIZACIÓN DEL NOMBRE DE USUARIO
  const setUserName = useCallback((name: string) => {
    const cleanName = name.trim();
    if (cleanName) {
      setState((prev) => ({ ...prev, userName: cleanName }));
    }
  }, []);

  return {
    ...state,
    requestWakeLock,
    releaseWakeLock,
    refreshLocation,
    setUserName,
  };
}
