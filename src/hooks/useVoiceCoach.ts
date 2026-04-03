// Voice Coach Hook
// Orchestrates: Speech Recognition → Gemini AI → TTS Response
// Also handles local instant commands (pause/resume) without API calls

import { useState, useEffect, useRef, useCallback } from 'react';
import { speechRecognitionService } from '@/services/speechRecognitionService';
import { geminiCoach, ExerciseContext } from '@/services/geminiCoachService';
import { voiceGuidance } from '@/services/voiceGuidanceService';
import { exerciseGuidance } from '@/services/voiceGuidanceService';

interface UseVoiceCoachOptions {
    exerciseId: number;
    exerciseName: string;
    currentAngle: number;
    targetAngle: number;
    currentRep: number;
    totalReps: number;
    currentSet: number;
    totalSets: number;
    repState: 'flexed' | 'extended';
    exercisePhase: string;
    isSensorConnected: boolean;
    actualPosture: string;
    expectedPosture: string;
    onPauseRequest: () => void;
    onResumeRequest: () => void;
    onEndRequest: () => void;
}

interface UseVoiceCoachReturn {
    isListening: boolean;
    isMicSupported: boolean;
    lastTranscript: string;
    micStatus: 'listening' | 'paused' | 'stopped' | 'error' | 'unsupported';
    isProcessing: boolean;
    currentLang: 'hi-IN' | 'en-US' | 'en-IN';
    toggleMic: () => void;
    toggleLanguage: () => void;
}

export function useVoiceCoach(options: UseVoiceCoachOptions): UseVoiceCoachReturn {
    const [isListening, setIsListening] = useState(false);
    const [lastTranscript, setLastTranscript] = useState('');
    const [micStatus, setMicStatus] = useState<'listening' | 'paused' | 'stopped' | 'error' | 'unsupported'>('stopped');
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentLang, setCurrentLang] = useState<'hi-IN' | 'en-US' | 'en-IN'>('en-IN');

    // Use ref to always have the latest options without re-subscribing
    const optionsRef = useRef(options);
    optionsRef.current = options;

    // Queue for pending transcripts (so we don't drop questions)
    const pendingTranscript = useRef<string | null>(null);
    const processingLock = useRef(false);

    const isMicSupported = speechRecognitionService.isSupported;

    // Build exercise context for Gemini
    const buildContext = useCallback((): ExerciseContext => {
        const opts = optionsRef.current;
        const guidance = exerciseGuidance[opts.exerciseId];
        return {
            exerciseName: opts.exerciseName,
            exerciseId: opts.exerciseId,
            currentAngle: opts.currentAngle,
            targetAngle: opts.targetAngle,
            currentRep: opts.currentRep,
            totalReps: opts.totalReps,
            currentSet: opts.currentSet,
            totalSets: opts.totalSets,
            repState: opts.repState,
            exercisePhase: opts.exercisePhase,
            isSensorConnected: opts.isSensorConnected,
            actualPosture: opts.actualPosture,
            expectedPosture: opts.expectedPosture,
            exerciseInstructions: guidance?.start || '',
        };
    }, []);

    // Handle local instant commands (no API call needed)
    // ONLY match very specific, unambiguous command phrases
    const handleLocalCommand = useCallback((transcript: string): boolean => {
        const lower = transcript.toLowerCase().trim();
        const opts = optionsRef.current;

        // Only match if the ENTIRE transcript is a short command (≤ 4 words)
        const wordCount = lower.split(/\s+/).length;

        // Pause command — English and Hindi
        if (wordCount <= 4 && /^(pause|pause exercise|wait|hold on|stop exercise|रुको|रुक जाओ|ठहरो)$/i.test(lower)) {
            console.log('[VoiceCoach] Local command: PAUSE');
            voiceGuidance.speak("Ruk rahe hain. Jab tayyar hon toh bolo continue.", true);
            opts.onPauseRequest();
            return true;
        }

        // Resume command — English and Hindi
        if (wordCount <= 3 && /^(resume|resume exercise|unpause|let's go|lets go|keep going|चलो|शुरू करो|आगे बढ़ो)$/i.test(lower)) {
            console.log('[VoiceCoach] Local command: RESUME');
            voiceGuidance.speak("Chaliye, aage badhte hain!", true);
            opts.onResumeRequest();
            return true;
        }

        // End/quit command — English and Hindi
        if (/^(end session|quit|i'm done|exit|finish exercise|बंद करो|बस करो|हो गया)$/i.test(lower)) {
            console.log('[VoiceCoach] Local command: END');
            voiceGuidance.speak("Session khatam. Aaj bahut achha kaam kiya!", true);
            setTimeout(() => opts.onEndRequest(), 1500);
            return true;
        }

        // Repeat last guidance — English and Hindi
        if (/^(repeat|say that again|what did you say|repeat that|फिर से बोलो|दोबारा बताओ)$/i.test(lower)) {
            console.log('[VoiceCoach] Local command: REPEAT');
            const last = voiceGuidance.getLastSpoken();
            if (last) {
                voiceGuidance.speak(last, true);
            } else {
                voiceGuidance.speak("Abhi tak kuch nahi bola. Kya madad chahiye?");
            }
            return true;
        }

        return false; // Not a local command — send to Gemini
    }, []);

    // Process transcript through Gemini
    const processTranscript = useCallback(async (transcript: string) => {
        console.log('[VoiceCoach] Processing transcript:', transcript);

        // Check for local commands first (instant response)
        if (handleLocalCommand(transcript)) return;

        // If already processing, queue this transcript (don't drop it)
        if (processingLock.current) {
            console.log('[VoiceCoach] Already processing, queuing:', transcript);
            pendingTranscript.current = transcript;
            return;
        }

        processingLock.current = true;
        setIsProcessing(true);

        try {
            console.log('[VoiceCoach] Sending to Gemini...');
            const context = buildContext();
            const response = await geminiCoach.getResponse(transcript, context);
            console.log('[VoiceCoach] Gemini response:', response);

            if (response) {
                voiceGuidance.speak(response, true);
            }
        } catch (error) {
            console.error('[VoiceCoach] Error getting Gemini response:', error);
            voiceGuidance.speak("I'm having trouble right now. Could you repeat that?");
        } finally {
            processingLock.current = false;
            setIsProcessing(false);

            // Process queued transcript if any
            if (pendingTranscript.current) {
                const queued = pendingTranscript.current;
                pendingTranscript.current = null;
                console.log('[VoiceCoach] Processing queued transcript:', queued);
                processTranscript(queued);
            }
        }
    }, [buildContext, handleLocalCommand]);

    // Setup speech recognition callbacks
    useEffect(() => {
        // On transcript received
        speechRecognitionService.setOnTranscript((transcript, isFinal) => {
            setLastTranscript(transcript);

            // Only process final transcripts
            if (isFinal && transcript.length > 2) {
                console.log('[VoiceCoach] Final transcript received:', transcript);
                processTranscript(transcript);
            }
        });

        // On status change
        speechRecognitionService.setOnStatusChange((status) => {
            console.log('[VoiceCoach] Mic status:', status);
            setMicStatus(status);
            setIsListening(status === 'listening');
        });

        // Setup TTS-to-mic coordination (echo prevention)
        voiceGuidance.setOnSpeakStart(() => {
            speechRecognitionService.pauseForTTS();
        });

        voiceGuidance.setOnSpeakEnd(() => {
            speechRecognitionService.resumeForTTS();
        });

        return () => {
            speechRecognitionService.setOnTranscript(() => { });
            speechRecognitionService.setOnStatusChange(() => { });
            voiceGuidance.setOnSpeakStart(null);
            voiceGuidance.setOnSpeakEnd(null);
        };
    }, [processTranscript]);

    // Initialize Gemini session when exercise changes
    useEffect(() => {
        if (options.exerciseId > 0) {
            console.log('[VoiceCoach] Starting Gemini session for exercise', options.exerciseId);
            geminiCoach.startSession(options.exerciseId);
        }
    }, [options.exerciseId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            speechRecognitionService.stop();
            geminiCoach.endSession();
        };
    }, []);

    const toggleMic = useCallback(async () => {
        if (speechRecognitionService.getShouldBeListening()) {
            console.log('[VoiceCoach] Stopping mic');
            speechRecognitionService.stop();
        } else {
            console.log('[VoiceCoach] Starting mic');
            speechRecognitionService.start();

            // Proactive greeting — AI introduces itself and asks a question
            const context = buildContext();
            try {
                const greeting = await geminiCoach.getResponse(
                    'The patient just started the exercise session and turned on the AI coach. Greet them warmly, tell them you are here to help, and ask how their knee is feeling today.',
                    context
                );
                if (greeting) {
                    voiceGuidance.speak(greeting, true);
                }
            } catch (e) {
                console.error('[VoiceCoach] Greeting error:', e);
                voiceGuidance.speak("Namaste! Main aapka AI coach hoon. Batayein, aaj ghutne mein kaisa lag raha hai?", true);
            }
        }
    }, [buildContext]);

    const toggleLanguage = useCallback(() => {
        const nextLang = currentLang === 'en-IN' ? 'hi-IN' : 'en-IN';
        setCurrentLang(nextLang);
        speechRecognitionService.setLanguage(nextLang);
        geminiCoach.setLanguage(nextLang);
        voiceGuidance.setLanguageOverride(nextLang);
        const langName = nextLang === 'hi-IN' ? 'हिंदी' : 'English';
        voiceGuidance.speak(`Language: ${langName}`, true);
        console.log('[VoiceCoach] Language toggled to:', nextLang);
    }, [currentLang]);

    return {
        isListening,
        isMicSupported,
        lastTranscript,
        micStatus,
        isProcessing,
        currentLang,
        toggleMic,
        toggleLanguage,
    };
}
