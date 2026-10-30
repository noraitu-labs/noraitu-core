"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NoraVoiceSynthesizer, noraVoiceSynthesizer } from "@/lib/audio/voice_synthesizer";
import { PNLProfile } from "@/lib/agents/pnl_analyzer";

// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — Hook useNoraVoice
//  Control de voz orgánica en cliente con desbloqueo táctil
// ══════════════════════════════════════════════════════════════

export interface UseNoraVoiceReturn {
  speak: (text: string, pnlProfile?: PNLProfile) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  currentSegment: string;
  segmentIndex: number;
  totalSegments: number;
}

export function useNoraVoice(): UseNoraVoiceReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSegment, setCurrentSegment] = useState("");
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);

  const synthRef = useRef<NoraVoiceSynthesizer | null>(null);

  useEffect(() => {
    // Instanciar o reutilizar el singleton
    if (!synthRef.current) {
      synthRef.current = noraVoiceSynthesizer || new NoraVoiceSynthesizer();
    }

    // Desbloqueo táctil para navegadores móviles (iOS Safari / Android Chrome)
    const handleFirstGesture = () => {
      synthRef.current?.unlockAudioContext();
      window.removeEventListener("touchstart", handleFirstGesture);
      window.removeEventListener("touchend", handleFirstGesture);
      window.removeEventListener("click", handleFirstGesture);
    };

    window.addEventListener("touchstart", handleFirstGesture, { passive: true });
    window.addEventListener("touchend", handleFirstGesture, { passive: true });
    window.addEventListener("click", handleFirstGesture, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleFirstGesture);
      window.removeEventListener("touchend", handleFirstGesture);
      window.removeEventListener("click", handleFirstGesture);
      synthRef.current?.stop();
    };
  }, []);

  const speak = useCallback(
    async (text: string, pnlProfile?: PNLProfile): Promise<void> => {
      if (!synthRef.current || !text.trim()) return;

      setIsSpeaking(true);

      await synthRef.current.speak(text, pnlProfile, {
        onSegmentStart: (seg, idx, total) => {
          setCurrentSegment(seg);
          setSegmentIndex(idx + 1);
          setTotalSegments(total);
        },
        onComplete: () => {
          setIsSpeaking(false);
          setCurrentSegment("");
        },
        onError: () => {
          setIsSpeaking(false);
          setCurrentSegment("");
        },
      });
    },
    []
  );

  const stop = useCallback(() => {
    synthRef.current?.stop();
    setIsSpeaking(false);
    setCurrentSegment("");
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    currentSegment,
    segmentIndex,
    totalSegments,
  };
}

