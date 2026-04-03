// Speech Recognition Service - Web Speech API Wrapper
// Provides continuous speech-to-text with auto-restart, echo prevention, and error recovery

type TranscriptCallback = (transcript: string, isFinal: boolean) => void;
type StatusCallback = (status: 'listening' | 'paused' | 'stopped' | 'error' | 'unsupported') => void;

interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
    error: string;
    message?: string;
}

export class SpeechRecognitionService {
    private recognition: any = null;
    private isListening: boolean = false;
    private isPausedForTTS: boolean = false;
    private shouldBeListening: boolean = false;
    private onTranscript: TranscriptCallback | null = null;
    private onStatusChange: StatusCallback | null = null;
    private restartTimeout: ReturnType<typeof setTimeout> | null = null;

    readonly isSupported: boolean;

    constructor() {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        this.isSupported = !!SpeechRecognition;

        if (this.isSupported) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            // Default to Indian English — understands both English and Hinglish
            this.recognition.lang = 'en-IN';
            this.recognition.maxAlternatives = 1;
            this.setupListeners();
        }
    }

    /**
     * Switch recognition language.
     * Supported: 'en-US' (English), 'hi-IN' (Hindi), 'en-IN' (Indian English)
     */
    setLanguage(lang: 'en-US' | 'hi-IN' | 'en-IN') {
        if (this.recognition) {
            this.recognition.lang = lang;
            console.log('[SpeechRecognition] Language set to:', lang);
            if (this.isListening) {
                try { this.recognition.stop(); } catch (e) { /* auto-restarts via onend */ }
            }
        }
    }

    private setupListeners() {
        if (!this.recognition) return;

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            const results = event.results;
            for (let i = event.resultIndex; i < results.length; i++) {
                const result = results[i];
                const transcript = result[0].transcript.trim();
                const isFinal = result.isFinal;

                if (transcript && this.onTranscript) {
                    this.onTranscript(transcript, isFinal);
                }
            }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.warn('[SpeechRecognition] Error:', event.error);

            // Don't treat these as fatal - just restart
            if (event.error === 'no-speech' || event.error === 'aborted') {
                // Normal - no speech detected, will auto-restart via onend
                return;
            }

            if (event.error === 'not-allowed') {
                this.onStatusChange?.('error');
                this.shouldBeListening = false;
                return;
            }

            // For network errors, try to restart after a delay
            if (event.error === 'network') {
                this.scheduleRestart(2000);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;

            // Auto-restart if we should be listening and not paused for TTS
            if (this.shouldBeListening && !this.isPausedForTTS) {
                this.scheduleRestart(300);
            } else {
                this.onStatusChange?.(this.isPausedForTTS ? 'paused' : 'stopped');
            }
        };

        this.recognition.onstart = () => {
            this.isListening = true;
            this.onStatusChange?.('listening');
        };
    }

    private scheduleRestart(delayMs: number) {
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
        }
        this.restartTimeout = setTimeout(() => {
            if (this.shouldBeListening && !this.isPausedForTTS) {
                this.startInternal();
            }
        }, delayMs);
    }

    private startInternal() {
        if (!this.recognition || this.isListening) return;
        try {
            this.recognition.start();
        } catch (e) {
            // Already started - ignore
            console.warn('[SpeechRecognition] Start error (likely already running):', e);
        }
    }

    // Public API

    setOnTranscript(callback: TranscriptCallback) {
        this.onTranscript = callback;
    }

    setOnStatusChange(callback: StatusCallback) {
        this.onStatusChange = callback;
    }

    start() {
        if (!this.isSupported) {
            this.onStatusChange?.('unsupported');
            return;
        }
        this.shouldBeListening = true;
        this.isPausedForTTS = false;
        this.startInternal();
    }

    stop() {
        this.shouldBeListening = false;
        this.isPausedForTTS = false;
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = null;
        }
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore
            }
        }
        this.onStatusChange?.('stopped');
    }

    /**
     * Pause recognition while TTS is speaking to prevent echo feedback.
     * Will automatically resume when resumeForTTS() is called.
     */
    pauseForTTS() {
        if (!this.shouldBeListening) return;
        this.isPausedForTTS = true;
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore
            }
        }
        this.onStatusChange?.('paused');
    }

    /**
     * Resume recognition after TTS has finished speaking.
     */
    resumeForTTS() {
        if (!this.shouldBeListening) return;
        this.isPausedForTTS = false;
        this.scheduleRestart(500); // Small delay after TTS ends
    }

    getIsListening(): boolean {
        return this.isListening;
    }

    getShouldBeListening(): boolean {
        return this.shouldBeListening;
    }

    destroy() {
        this.stop();
        this.onTranscript = null;
        this.onStatusChange = null;
    }
}

export const speechRecognitionService = new SpeechRecognitionService();
