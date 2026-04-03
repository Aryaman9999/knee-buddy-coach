// Gemini AI Coach Service
// Handles communication with Gemini API for conversational exercise coaching

import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';

export interface ExerciseContext {
    exerciseName: string;
    exerciseId: number;
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
    exerciseInstructions: string;
}

const SYSTEM_PROMPT = `You are KneeBuddy, a warm, patient, and caring AI physiotherapy coach designed for elderly osteoarthritis (OA) patients doing home-based knee rehabilitation. You guide them through exercises in real-time using sensor data from wearable sensors on their body.

YOUR MISSION:
This app exists to make physiotherapy accessible for elderly osteoarthritis patients who struggle with:
- Performing exercises correctly at home without a physiotherapist present
- Lack of continuous monitoring and feedback during home exercises
- Reduced mobility due to knee pain and stiffness from osteoarthritis
- Dependence on frequent, expensive hospital/clinic visits
You are their virtual physiotherapy assistant — always available, always patient, always encouraging.

LANGUAGE:
- You are BILINGUAL: respond in the SAME language the patient speaks to you
- If they speak in Hindi (or Hinglish), respond in simple Hindi (USE DEVANAGARI SCRIPT ONLY for Hindi, e.g. "बहुत अच्छा")
- If they speak in English, respond in simple English
- Use simple, everyday words — avoid complex medical jargon
- Example Hindi responses: "बहुत अच्छा! आप बहुत अच्छे से कर रहे हैं।"

PERSONALITY & TONE:
- Speak like a kind, patient family member helping them exercise — not a strict doctor
- Be EXTRA patient — never sound frustrated, even if they ask the same question multiple times
- Celebrate small wins enthusiastically: "Wonderful! You bent 5 degrees more than last time!"
- Use respectful language appropriate for elderly patients
- Keep responses to 1-3 short sentences (they will be spoken aloud)
- Speak naturally — no bullet points, no markdown, no formatted text

INTERACTIVE COACHING — ASK QUESTIONS:
You should proactively ask the patient questions to make the session interactive and caring:
- "How is your knee feeling today? Any stiffness?" (at the start)
- "Is this comfortable, or should we reduce the range?" (during exercise)
- "Are you feeling any sharp pain? Tell me and we'll adjust." (mid-exercise)
- "Did you ice your knee after yesterday's session?" (between sets)
- "Have you been taking your medicines on time?" (between sets)
- "Would you like to take a longer rest before the next set?" (between sets)
- "How does this angle feel compared to yesterday?" (during movement)
Ask ONE question at a time, naturally woven into your coaching.

SAFETY — HIGHEST PRIORITY:
- If patient reports pain: IMMEDIATELY recommend stopping or reducing range of motion
- Distinguish: "Dull ache or mild discomfort during movement is normal with OA. But sharp, sudden, or stabbing pain means STOP immediately."
- If they mention swelling, redness, or warmth in the joint: recommend rest and ice, and suggest consulting their doctor
- Never diagnose. You coach and support, you don't prescribe medications or diagnose conditions
- Always remind: "Agar zyada dard ho toh ruk jaiye. Apne doctor se zaroor baat karein."

OSTEOARTHRITIS KNOWLEDGE:
- OA causes cartilage breakdown, leading to pain, stiffness, and reduced mobility
- Morning stiffness lasting <30 minutes is typical for OA (vs >30 min for rheumatoid arthritis)
- Exercise is one of the BEST treatments for OA — it strengthens muscles around the joint, reducing pain
- "Aaram karne se ghutne ki takleef badhti hai. Halka exercise karna zaroori hai."
- Heat therapy (warm towel) BEFORE exercise helps reduce stiffness
- Ice therapy (cold pack) AFTER exercise helps reduce swelling
- Weight management helps reduce stress on knee joints
- Low-impact exercises are ideal — avoid running, jumping, deep squats
- Consistency matters more than intensity — even 10-15 minutes daily helps
- Flare-up management: during a flare-up, reduce exercise intensity but don't stop completely
- Medication: NSAIDs for pain, but exercise is the long-term solution

ELDERLY PATIENT CARE:
- Always ask about their comfort and adjust recommendations
- Remind about BALANCE and FALL PREVENTION: "Make sure you're holding onto a chair or wall"
- For standing exercises: "Koi chair ya deewar ke paas khade hokar exercise kijiye"
- Encourage longer rests between sets — "There's no hurry, take your time"
- Progress may be slow — celebrate EVERY improvement, no matter how small
- Remind them to exercise at regular times for building habit
- Suggest they keep water nearby during exercise
- If they sound tired: "Aap thak gaye hain? Thoda rest le lijiye, koi jaldi nahi hai."

EXERCISE KNOWLEDGE BASE:

Exercise 1 - HEEL SLIDES (Lying, target: 110°, knee flexion):
  Technique: Lie flat, slide heel toward buttocks bending the knee, then slide back.
  For OA patients: Start with whatever range is comfortable. Even 60-70° is good progress.
  Muscles: Hamstrings, quadriceps, hip flexors.
  Purpose: Improves knee flexion — helps with sitting, climbing stairs.

Exercise 2 - QUAD SETS (Lying, isometric):
  Technique: Tighten thigh, push back of knee into bed. Hold 3-5 seconds, relax.
  For OA patients: Excellent starting exercise — no joint movement means less pain.
  Muscles: Quadriceps.
  Purpose: Strengthens the muscle that protects your knee joint.

Exercise 3 - STRAIGHT LEG RAISES (Lying, target: 45°, hip flexion):
  Technique: Lock knee straight, lift entire leg to 45°, hold, lower slowly.
  For OA patients: Strengthens without bending the knee — ideal for painful knees.
  Muscles: Quadriceps, hip flexors.
  Purpose: Builds leg strength for walking and standing.

Exercise 4 - ANKLE PUMPS (Lying, target: 30°):
  Technique: Point toes up then down rhythmically.
  For OA patients: Easiest exercise — great for days when knee is very stiff.
  Muscles: Calf muscles.
  Purpose: Improves blood circulation, reduces swelling.

Exercise 5 - SHORT ARC QUADS (Lying with roll, target: 60°):
  Technique: Roll under knee, straighten by lifting foot, lower slowly.
  For OA patients: Focuses on the last few degrees of extension — critical for walking.
  Muscles: Quadriceps (VMO).
  Purpose: Helps achieve full knee straightening.

Exercise 6 - HAMSTRING CURLS (Standing, target: 90°):
  Technique: Hold support, bend knee bringing heel toward buttocks.
  For OA patients: Hold a chair firmly! Go only as far as comfortable.
  Muscles: Hamstrings.
  Purpose: Balances quad strength, improves walking.

Exercise 7 - HIP ABDUCTION (Standing, target: 45°):
  Technique: Hold support, lift leg straight out to side.
  For OA patients: This prevents falls — very important for elderly patients.
  Muscles: Gluteus medius.
  Purpose: Walking stability and fall prevention.

Exercise 8 - LONG ARC QUADS (Sitting, target: 90°):
  Technique: Sit in chair, straighten knee lifting foot, hold, lower slowly.
  For OA patients: Can do while watching TV — make it part of daily routine!
  Muscles: Quadriceps.
  Purpose: Full range quad strengthening for daily activities.

HOME EXERCISE REMINDERS:
- "Kya aapne exercise se pehle garam patti lagayi?" (Did you warm up with heat?)
- "Exercise ke baad 15-20 minute ice zaroor lagaiye"
- "Apne paas ek glass paani rakh lijiye"
- "Chair ya deewar ka sahara lekar khade hoiye" (for standing exercises)
- Remind about non-slip footwear and clear exercise space

REAL-TIME DATA FORMAT (provided with every message):
[Exercise: name | Angle: current°/target° (X% of target) | Rep: X/Y | Set: A/B | Movement: flexed/extended | Sensor: status]`;

export class GeminiCoachService {
    private genAI: GoogleGenerativeAI | null = null;
    private chatSession: ChatSession | null = null;
    private isInitialized: boolean = false;
    private lastResponse: string = '';
    private currentExerciseId: number = -1;
    private currentLanguage: string = 'en-IN'; // Default to English

    // Fallback responses when API is unavailable
    private static readonly FALLBACK_RESPONSES: Record<string, Record<'en' | 'hi', string[]>> = {
        angle: {
            en: [
                "You're doing well! Keep moving toward your target angle.",
                "Good range of motion! Try to push just a little further.",
            ],
            hi: [
                "बहुत अच्छा कर रहे हैं! थोड़ा और मुड़ने की कोशिश करें।",
                "सही दिशा में हैं! टारगेट एंगल की तरफ बढ़ते रहें।"
            ]
        },
        progress: {
            en: [
                "You're making great progress! Keep up the good work.",
                "Excellent effort! Stay consistent with your reps.",
            ],
            hi: [
                "आप बहुत अच्छी प्रगति कर रहे हैं! ऐसे ही करते रहें।",
                "लाजवाब प्रयास! अपने रेप्स पूरे करें।"
            ]
        },
        pain: {
            en: [
                "If you're feeling pain, please stop and rest. Reduce your range of motion on the next attempt. If pain persists, contact your therapist.",
            ],
            hi: [
                "अगर आपको दर्द महसूस हो रहा है, तो कृपया रुक जाएं और आराम करें। अगली बार थोड़ा कम मुड़ने की कोशिश करें। अगर दर्द बना रहता है, तो अपने डॉक्टर से बात करें।"
            ]
        },
        help: {
            en: [
                "Focus on smooth, controlled movements. I'm here to guide you through this!",
            ],
            hi: [
                "ध्यान रखें, आराम से और नियंत्रित तरीके से करें। मैं आपकी मदद के लिए यहाँ हूँ!"
            ]
        },
        general: {
            en: [
                "You're doing great! Keep going!",
                "Nice work! Stay focused on your form.",
                "Excellent! Maintain that steady pace.",
            ],
            hi: [
                "बहुत बढ़िया कर रहे हैं! जारी रखें!",
                "अच्छा काम! अपने फॉर्म पर ध्यान दें।",
                "बहुत खूब! इसी रफ़्तार के साथ आगे बढ़ते रहें।"
            ]
        },
    };

    constructor() {
        this.initialize();
    }

    setLanguage(lang: string) {
        this.currentLanguage = lang;
        console.log('[GeminiCoach] Language set to:', lang);
    }

    private initialize() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('[GeminiCoach] No API key found. Set VITE_GEMINI_API_KEY in .env. Using fallback responses.');
            return;
        }

        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.isInitialized = true;
            console.log('[GeminiCoach] Initialized successfully');
        } catch (error) {
            console.error('[GeminiCoach] Failed to initialize:', error);
        }
    }

    /**
     * Start or reset a chat session for a specific exercise.
     */
    startSession(exerciseId: number) {
        // Lazy re-initialization: if the API key was added after initial load, try again
        if (!this.isInitialized) {
            this.initialize();
        }

        if (!this.isInitialized || !this.genAI) {
            console.warn('[GeminiCoach] Cannot start session — not initialized. Check VITE_GEMINI_API_KEY in .env');
            return;
        }

        // Reset session when switching exercises
        if (exerciseId !== this.currentExerciseId) {
            this.currentExerciseId = exerciseId;
            try {
                const model = this.genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    systemInstruction: SYSTEM_PROMPT,
                });
                this.chatSession = model.startChat({
                    history: [],
                });
                console.log('[GeminiCoach] ✅ Chat session started for exercise', exerciseId);
            } catch (error) {
                console.error('[GeminiCoach] Failed to start chat session:', error);
                this.chatSession = null;
            }
        }
    }

    /**
     * Send a user message with exercise context to Gemini and get a response.
     */
    async getResponse(userMessage: string, context: ExerciseContext): Promise<string> {
        // Build rich context string
        const anglePercent = context.targetAngle > 0
            ? Math.round((context.currentAngle / context.targetAngle) * 100)
            : 0;
        const movementDesc = context.repState === 'flexed'
            ? 'currently bending/contracting'
            : 'currently straight/relaxed';

        const contextStr = `[Exercise: ${context.exerciseName} (ID ${context.exerciseId}) | Angle: ${Math.round(context.currentAngle)}°/${context.targetAngle}° (${anglePercent}% of target) | Rep: ${context.currentRep}/${context.totalReps} | Set: ${context.currentSet}/${context.totalSets} | Movement: ${movementDesc} | Posture: ${context.actualPosture} (Expected: ${context.expectedPosture}) | Sensor: ${context.isSensorConnected ? 'connected' : 'disconnected'}]`;

        const languageHint = this.currentLanguage.startsWith('hi') ? '[Language Preference: Hindi (Respond in Devanagari script)]' : '[Language Preference: English]';
        const fullMessage = `${languageHint}\n${contextStr}\nPatient says: "${userMessage}"`;

        console.log('[GeminiCoach] Sending to API:', fullMessage);

        // Try Gemini API first
        if (this.chatSession) {
            try {
                const result = await this.chatSession.sendMessage(fullMessage);
                const response = result.response.text().trim();
                this.lastResponse = response;
                console.log('[GeminiCoach] ✅ API response:', response);
                return response;
            } catch (error) {
                console.error('[GeminiCoach] ❌ API error, using fallback:', error);
            }
        } else {
            console.warn('[GeminiCoach] No active chat session — using fallback responses');
        }

        // Fallback: simple keyword matching
        return this.getFallbackResponse(userMessage, context);
    }

    private getFallbackResponse(userMessage: string, context: ExerciseContext): string {
        const lower = userMessage.toLowerCase();
        const isHi = this.currentLanguage.startsWith('hi');
        const langKey = isHi ? 'hi' : 'en';

        // Pain/safety — always prioritize (English and Hindi keywords)
        if (lower.includes('hurt') || lower.includes('pain') || lower.includes('ouch') || lower.includes('stop') ||
            lower.includes('dard') || lower.includes('takleef') || lower.includes('ruko') || lower.includes('ruk') || lower.includes('chhod') || lower.includes('dukh')) {
            return this.pickRandom(GeminiCoachService.FALLBACK_RESPONSES.pain[langKey]);
        }

        // Angle query
        if (lower.includes('angle') || lower.includes('degree') || lower.includes('how far') || lower.includes('range') || lower.includes('kitna') || lower.includes('angle kya')) {
            const diff = context.targetAngle - context.currentAngle;
            if (diff > 5) {
                if (isHi) return `आप ${Math.round(context.currentAngle)} डिग्री पर हैं, जो आपके टारगेट का ${Math.round((context.currentAngle / context.targetAngle) * 100)}% है। ${Math.round(diff)} डिग्री और बाकी है!`;
                return `You're at ${Math.round(context.currentAngle)} degrees, which is ${Math.round((context.currentAngle / context.targetAngle) * 100)}% of your target. ${Math.round(diff)} more degrees to go!`;
            }
            if (isHi) return `बहुत बढ़िया! आप ${Math.round(context.currentAngle)} डिग्री पर हैं - बिल्कुल अपने टारगेट ${context.targetAngle} पर!`;
            return `Excellent! You're at ${Math.round(context.currentAngle)} degrees — right at your target of ${context.targetAngle}!`;
        }

        // How am I doing / form assessment
        if (lower.includes('how am i') || lower.includes('doing well') || lower.includes('my form') || lower.includes('kaisa kar') || lower.includes('sahi hai')) {
            const percent = context.targetAngle > 0 ? (context.currentAngle / context.targetAngle) * 100 : 0;
            if (percent >= 90) return isHi ? `आप बहुत अच्छा कर रहे हैं! आप लगातार ${Math.round(percent)}% टारगेट हासिल कर रहे हैं।` : `Your form looks great! You're hitting ${Math.round(percent)}% of your target angle consistently.`;
            if (percent >= 60) return isHi ? `अच्छा प्रयास है! आप ${Math.round(percent)}% तक पहुँच रहे हैं। थोड़ा और कोशिश करें।` : `Good effort! You're reaching ${Math.round(percent)}% of your target. Try to push a bit further each rep.`;
            return isHi ? `आप वार्म अप कर रहे हैं। आराम से और स्मूथ करने की कोशिश करें।` : `You're warming up nicely at ${Math.round(percent)}% of target. Focus on smooth, controlled movements to increase your range.`;
        }

        // Rep/progress query
        if (lower.includes('rep') || lower.includes('how many') || lower.includes('left') || lower.includes('kitne bache') || lower.includes('kitna baaki')) {
            const remaining = context.totalReps - context.currentRep;
            if (remaining <= 3 && remaining > 0) return isHi ? `बस पूरा होने वाला है! सिर्फ ${remaining} रेप्स और बचे हैं। हिम्मत रखें!` : `Almost done! Just ${remaining} more reps in set ${context.currentSet} of ${context.totalSets}. Push through!`;
            return isHi ? `आपने ${context.totalReps} में से ${context.currentRep} रेप्स पूरे कर लिए हैं। ${remaining} और करने हैं!` : `You've done ${context.currentRep} of ${context.totalReps} reps in set ${context.currentSet} of ${context.totalSets}. ${remaining} more to go!`;
        }

        // Technique / how to do it / instructions
        if (lower.includes('help') || lower.includes('what should') || lower.includes('how do i') || lower.includes('kaise') || lower.includes('kya karu') || lower.includes('madad')) {
            return this.pickRandom(GeminiCoachService.FALLBACK_RESPONSES.help[langKey]);
        }

        // Pause/resume (handled locally by the hook, but respond if asked)
        if (lower.includes('pause') || lower.includes('wait') || lower.includes('thahar') || lower.includes('rukne')) {
            return isHi ? "रुक रहे हैं। जब तैयार हों तो शुरू करें बोलें।" : "Pausing your exercise. Say resume when you're ready to continue.";
        }
        if (lower.includes('resume') || lower.includes('unpause') || lower.includes('shuru karein') || lower.includes('chalo')) {
            return isHi ? "चलिए, आगे बढ़ते हैं! बहुत अच्छा काम।" : "Let's continue! Keep up the great work.";
        }

        // General encouragement
        return this.pickRandom(GeminiCoachService.FALLBACK_RESPONSES.general[langKey]);
    }

    private pickRandom(arr: string[]): string {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    getLastResponse(): string {
        return this.lastResponse;
    }

    isAvailable(): boolean {
        return this.isInitialized;
    }

    endSession() {
        this.chatSession = null;
        this.currentExerciseId = -1;
    }
}

export const geminiCoach = new GeminiCoachService();
