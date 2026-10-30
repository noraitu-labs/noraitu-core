import { PNLProfile } from "../agents/pnl_analyzer";

// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — NoraVoiceSynthesizer (Mobile & Desktop)
//  Motor de Síntesis Orgánica con Cadencia, Bloques de Respiración
//  y Modulación Acústica Dinámica basada en PNL
// ══════════════════════════════════════════════════════════════

export interface SpeechPlaybackOptions {
  onSegmentStart?: (segment: string, index: number, total: number) => void;
  onBoundary?: (charIndex: number) => void;
  onComplete?: () => void;
  onError?: (err: any) => void;
}

export class NoraVoiceSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private isSpeaking = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;
  private isUnlocked = false;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
    }
  }

  /**
   * Carga y selecciona la mejor voz en español disponible en el sistema.
   */
  private initVoices(): void {
    if (!this.synth) return;

    const load = () => {
      const voices = this.synth?.getVoices() || [];
      if (voices.length > 0) {
        this.voicesLoaded = true;
        this.selectedVoice = this.pickBestSpanishVoice(voices);
      }
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  /**
   * Prioriza voces neuronales y nativas en español del dispositivo:
   * 1. Rioplatense / Argentina (Elena, Tomas, es-AR)
   * 2. Google Español Natural (Android/Chrome)
   * 3. Apple iOS (Mónica, Paulina)
   * 4. Microsoft Neural / Desktop (Sabina, Raul, Helena)
   */
  public pickBestSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const spanish = voices.filter(
      (v) => v.lang.startsWith("es") || v.lang.toLowerCase().includes("es-")
    );

    if (spanish.length === 0) return null;

    // 1. Argentina / Rioplatense
    const arVoice = spanish.find(
      (v) =>
        v.lang === "es-AR" ||
        v.name.toLowerCase().includes("elena") ||
        v.name.toLowerCase().includes("tomas")
    );
    if (arVoice) return arVoice;

    // 2. Google Español
    const googleEs = spanish.find((v) =>
      v.name.toLowerCase().includes("google")
    );
    if (googleEs) return googleEs;

    // 3. Apple iOS
    const appleEs = spanish.find(
      (v) =>
        v.name.toLowerCase().includes("paulina") ||
        v.name.toLowerCase().includes("mónica") ||
        v.name.toLowerCase().includes("monica")
    );
    if (appleEs) return appleEs;

    // 4. Microsoft Neural / Desktop
    const msEs = spanish.find(
      (v) =>
        v.name.toLowerCase().includes("sabina") ||
        v.name.toLowerCase().includes("raul") ||
        v.name.toLowerCase().includes("helena")
    );
    if (msEs) return msEs;

    return spanish[0];
  }

  /**
   * Desbloquea el subsistema de audio en navegadores móviles (iOS Safari / Android Chrome)
   * al detectar el primer gesto táctil o clic del usuario.
   */
  public unlockAudioContext(): void {
    if (this.isUnlocked || !this.synth) return;
    try {
      const silentUtterance = new SpeechSynthesisUtterance("");
      silentUtterance.volume = 0;
      this.synth.speak(silentUtterance);
      this.isUnlocked = true;
    } catch {
      // Ignorar si el navegador aún no permite speak
    }
  }

  /**
   * Divide la respuesta en unidades de respiración utilizando delimitadores
   * de pausa natural: elipsis (...), saltos de línea (\n), punto, signo de interrogación/exclamación y comas.
   */
  public parseBreathUnits(text: string): string[] {
    return text
      // Normalizar saltos de línea
      .replace(/\r\n/g, "\n")
      // Dividir por delimitadores preservando sentido
      .split(/(?<=[.!?…\n])\s+|(?<=\.\.\.)\s*|(?<=,)\s+(?=[A-ZÁÉÍÓÚa-záéíóú¿¡])/g)
      .map((s) => s.trim().replace(/^[-*•]\s*/, ""))
      .filter((s) => s.length > 0);
  }

  /**
   * Calcula los parámetros acústicos de velocidad (rate) y tono (pitch)
   * según la calibración de PNL del interlocutor.
   */
  public computePnlVoiceParams(profile?: PNLProfile): { rate: number; pitch: number; breathDelayMs: number } {
    if (!profile) {
      return { rate: 0.95, pitch: 1.0, breathDelayMs: 300 };
    }

    // Regla de Contención: FEAR o SADNESS -> Voz calma, pausada, contenedora
    if (profile.emotionalTone === "FEAR" || profile.emotionalTone === "SADNESS") {
      return { rate: 0.88, pitch: 0.94, breathDelayMs: 360 };
    }

    // Regla de Optimismo: JOY -> Voz ágil, brillante y conectiva
    if (profile.emotionalTone === "JOY") {
      return { rate: 1.02, pitch: 1.04, breathDelayMs: 250 };
    }

    // Regla de Desaceleración por Vacilación / Duda
    if (profile.confidenceLevel === "LOW") {
      return { rate: 0.90, pitch: 0.96, breathDelayMs: 340 };
    }

    // Tono por defecto: CALM / DIGITAL
    return { rate: 0.95, pitch: 1.0, breathDelayMs: 300 };
  }

  /**
   * Reproduce secuencialmente la cola de oraciones insertando un delay de respiración artificial
   * (250ms a 380ms) en el evento onend de cada segmento.
   */
  public async speak(
    text: string,
    pnlProfile?: PNLProfile,
    options: SpeechPlaybackOptions = {}
  ): Promise<void> {
    if (!this.synth) {
      options.onError?.(new Error("Web Speech API no disponible en este dispositivo."));
      return;
    }

    this.stop();
    this.isSpeaking = true;
    this.unlockAudioContext();

    const segments = this.parseBreathUnits(text);
    if (segments.length === 0) {
      this.isSpeaking = false;
      options.onComplete?.();
      return;
    }

    const { rate, pitch, breathDelayMs } = this.computePnlVoiceParams(pnlProfile);

    for (let i = 0; i < segments.length; i++) {
      if (!this.isSpeaking) break;

      const segment = segments[i];
      options.onSegmentStart?.(segment, i, segments.length);

      await this.speakSegment(segment, {
        rate,
        pitch,
        onBoundary: options.onBoundary,
      });

      // Silencio artificial que simula inhalación y pausa respiratoria humana
      if (i < segments.length - 1 && this.isSpeaking) {
        await new Promise((resolve) => setTimeout(resolve, breathDelayMs));
      }
    }

    this.isSpeaking = false;
    options.onComplete?.();
  }

  private speakSegment(
    segment: string,
    params: {
      rate: number;
      pitch: number;
      onBoundary?: (charIndex: number) => void;
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(segment);
      utterance.rate = params.rate;
      utterance.pitch = params.pitch;
      utterance.volume = 1.0;

      if (!this.selectedVoice && this.synth.getVoices().length > 0) {
        this.selectedVoice = this.pickBestSpanishVoice(this.synth.getVoices());
      }

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
        utterance.lang = this.selectedVoice.lang;
      } else {
        utterance.lang = "es-AR";
      }

      utterance.onboundary = (e) => {
        params.onBoundary?.(e.charIndex);
      };

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (err) => {
        // En navegadores móviles puede dispararse error al cambiar de pestaña
        console.warn("[NoraVoiceSynthesizer] Segment warning:", err);
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  public stop(): void {
    this.isSpeaking = false;
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public getSpeakingState(): boolean {
    return this.isSpeaking;
  }
}

// Singleton para uso en cliente
export const noraVoiceSynthesizer =
  typeof window !== "undefined" ? new NoraVoiceSynthesizer() : null;
