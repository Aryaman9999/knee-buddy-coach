export type VoiceLanguage = 'en' | 'hi' | 'pa';

const languageConfig: Record<VoiceLanguage, { code: string; name: string }> = {
  en: { code: 'en-US', name: 'English' },
  hi: { code: 'hi-IN', name: 'हिंदी' },
  pa: { code: 'pa-IN', name: 'ਪੰਜਾਬੀ' }
};

// Translations for common phrases
const translations: Record<string, Record<VoiceLanguage, string>> = {
  // Demo phase
  "Watch the demonstration carefully": {
    en: "Watch the demonstration carefully",
    hi: "प्रदर्शन को ध्यान से देखें",
    pa: "ਪ੍ਰਦਰਸ਼ਨ ਨੂੰ ਧਿਆਨ ਨਾਲ ਦੇਖੋ"
  },
  "Get ready to begin": {
    en: "Get ready to begin",
    hi: "शुरू करने के लिए तैयार हो जाएं",
    pa: "ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਤਿਆਰ ਹੋ ਜਾਓ"
  },
  // Countdown
  "3": { en: "3", hi: "3", pa: "3" },
  "2": { en: "2", hi: "2", pa: "2" },
  "1": { en: "1", hi: "1", pa: "1" },
  // Rep counts
  "1 rep": { en: "1", hi: "1", pa: "1" },
  "2 reps": { en: "2", hi: "2", pa: "2" },
  "3 reps": { en: "3", hi: "3", pa: "3" },
  "4 reps": { en: "4", hi: "4", pa: "4" },
  "5 reps": { en: "5", hi: "5", pa: "5" },
  "6 reps": { en: "6", hi: "6", pa: "6" },
  "7 reps": { en: "7", hi: "7", pa: "7" },
  "8 reps": { en: "8", hi: "8", pa: "8" },
  "9 reps": { en: "9", hi: "9", pa: "9" },
  "10 reps": { en: "10", hi: "10", pa: "10" },
  // Set complete messages
  "Set complete. Rest for a moment.": {
    en: "Set complete. Rest for a moment.",
    hi: "सेट पूरा हुआ। थोड़ा आराम करें।",
    pa: "ਸੈੱਟ ਪੂਰਾ ਹੋਇਆ। ਥੋੜਾ ਆਰਾਮ ਕਰੋ।"
  },
  // Exercise complete
  "Exercise complete! Excellent work!": {
    en: "Exercise complete! Excellent work!",
    hi: "व्यायाम पूरा हुआ! बहुत अच्छा काम!",
    pa: "ਕਸਰਤ ਪੂਰੀ ਹੋਈ! ਬਹੁਤ ਵਧੀਆ ਕੰਮ!"
  }
};

export class VoiceGuidanceService {
  private synth: SpeechSynthesis;
  private isSpeaking: boolean = false;
  private queue: string[] = [];
  private isEnabled: boolean = true;
  private language: VoiceLanguage = 'en';

  constructor() {
    this.synth = window.speechSynthesis;
  }

  setLanguage(lang: VoiceLanguage) {
    this.language = lang;
  }

  getLanguage(): VoiceLanguage {
    return this.language;
  }

  getLanguageConfig() {
    return languageConfig;
  }

  // Translate a phrase if translation exists
  private translate(text: string): string {
    // Check if it's a number (rep count)
    if (/^\d+$/.test(text)) {
      return text; // Numbers stay the same
    }
    
    // Check direct translation
    if (translations[text]) {
      return translations[text][this.language];
    }
    
    // Check for set complete pattern
    const setCompleteMatch = text.match(/Set (\d+) complete\. Rest for a moment\./);
    if (setCompleteMatch) {
      const setNum = setCompleteMatch[1];
      const baseTranslation = translations["Set complete. Rest for a moment."][this.language];
      if (this.language === 'hi') {
        return `सेट ${setNum} पूरा हुआ। थोड़ा आराम करें।`;
      } else if (this.language === 'pa') {
        return `ਸੈੱਟ ${setNum} ਪੂਰਾ ਹੋਇਆ। ਥੋੜਾ ਆਰਾਮ ਕਰੋ।`;
      }
      return text;
    }
    
    return text;
  }

  speak(text: string, interrupt: boolean = false) {
    if (!this.isEnabled) return;

    const translatedText = this.translate(text);

    if (interrupt) {
      this.synth.cancel();
      this.queue = [];
      this.isSpeaking = false;
    }

    if (this.isSpeaking && !interrupt) {
      this.queue.push(translatedText);
      return;
    }

    this.speakNow(translatedText);
  }

  private speakNow(text: string) {
    this.isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = languageConfig[this.language].code;

    // Try to find a voice for the language
    const voices = this.synth.getVoices();
    const langCode = languageConfig[this.language].code;
    const matchingVoice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) this.speakNow(next);
      }
    };

    this.synth.speak(utterance);
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.synth.cancel();
      this.queue = [];
      this.isSpeaking = false;
    }
    return this.isEnabled;
  }

  cancel() {
    this.synth.cancel();
    this.queue = [];
    this.isSpeaking = false;
  }
}

export const voiceGuidance = new VoiceGuidanceService();

// Exercise-specific guidance with translations
export const exerciseGuidance: Record<number, Record<VoiceLanguage, { start: string; formCues: string[] }>> = {
  1: { // Heel Slides
    en: {
      start: "Lie flat on your back. Begin heel slides. Slide your heel towards your buttocks, then back out.",
      formCues: [
        "Keep your knee aligned",
        "Smooth controlled motion",
        "Don't rush the movement"
      ]
    },
    hi: {
      start: "अपनी पीठ के बल लेट जाएं। हील स्लाइड शुरू करें। अपनी एड़ी को नितंबों की ओर स्लाइड करें, फिर वापस ले जाएं।",
      formCues: [
        "अपने घुटने को सीध में रखें",
        "धीमी नियंत्रित गति",
        "जल्दबाजी न करें"
      ]
    },
    pa: {
      start: "ਆਪਣੀ ਪਿੱਠ ਦੇ ਭਾਰ ਲੇਟ ਜਾਓ। ਹੀਲ ਸਲਾਈਡ ਸ਼ੁਰੂ ਕਰੋ। ਆਪਣੀ ਅੱਡੀ ਨੂੰ ਨਿਤੰਬਾਂ ਵੱਲ ਸਲਾਈਡ ਕਰੋ, ਫਿਰ ਵਾਪਸ ਲੈ ਜਾਓ।",
      formCues: [
        "ਆਪਣੇ ਗੋਡੇ ਨੂੰ ਸਿੱਧਾ ਰੱਖੋ",
        "ਹੌਲੀ ਨਿਯੰਤਰਿਤ ਗਤੀ",
        "ਜਲਦਬਾਜ਼ੀ ਨਾ ਕਰੋ"
      ]
    }
  },
  2: { // Quad Sets (Lying)
    en: {
      start: "Lie flat on your back with both legs extended and relaxed. Keep your heel on the bed. Begin quad sets.",
      formCues: [
        "Tighten your thigh muscle",
        "Push the back of your knee down toward the bed",
        "Hold for three seconds",
        "Your kneecap should pull upward slightly",
        "Relax completely for two seconds"
      ]
    },
    hi: {
      start: "दोनों पैरों को फैलाकर और आराम से पीठ के बल लेट जाएं। अपनी एड़ी को बिस्तर पर रखें। क्वाड सेट शुरू करें।",
      formCues: [
        "अपनी जांघ की मांसपेशियों को कसें",
        "अपने घुटने के पीछे को बिस्तर की ओर दबाएं",
        "तीन सेकंड के लिए रुकें",
        "आपका घुटने का ढक्कन थोड़ा ऊपर उठना चाहिए",
        "दो सेकंड के लिए पूरी तरह आराम करें"
      ]
    },
    pa: {
      start: "ਦੋਵੇਂ ਲੱਤਾਂ ਫੈਲਾ ਕੇ ਅਤੇ ਆਰਾਮ ਨਾਲ ਪਿੱਠ ਦੇ ਭਾਰ ਲੇਟ ਜਾਓ। ਆਪਣੀ ਅੱਡੀ ਨੂੰ ਬਿਸਤਰੇ 'ਤੇ ਰੱਖੋ। ਕੁਆਡ ਸੈੱਟ ਸ਼ੁਰੂ ਕਰੋ।",
      formCues: [
        "ਆਪਣੀ ਪੱਟ ਦੀ ਮਾਸਪੇਸ਼ੀ ਨੂੰ ਕੱਸੋ",
        "ਆਪਣੇ ਗੋਡੇ ਦੇ ਪਿੱਛੇ ਨੂੰ ਬਿਸਤਰੇ ਵੱਲ ਦਬਾਓ",
        "ਤਿੰਨ ਸਕਿੰਟ ਲਈ ਰੁਕੋ",
        "ਤੁਹਾਡਾ ਗੋਡੇ ਦਾ ਢੱਕਣ ਥੋੜਾ ਉੱਪਰ ਉੱਠਣਾ ਚਾਹੀਦਾ ਹੈ",
        "ਦੋ ਸਕਿੰਟ ਲਈ ਪੂਰੀ ਤਰ੍ਹਾਂ ਆਰਾਮ ਕਰੋ"
      ]
    }
  },
  3: { // Straight Leg Raises
    en: {
      start: "Lie flat on your back. Begin straight leg raises. Keep your leg straight and lift.",
      formCues: [
        "Lock your knee",
        "Lift to hip level",
        "Lower slowly"
      ]
    },
    hi: {
      start: "अपनी पीठ के बल लेट जाएं। सीधी टांग उठाना शुरू करें। अपनी टांग को सीधा रखें और उठाएं।",
      formCues: [
        "अपने घुटने को लॉक करें",
        "कूल्हे के स्तर तक उठाएं",
        "धीरे-धीरे नीचे लाएं"
      ]
    },
    pa: {
      start: "ਆਪਣੀ ਪਿੱਠ ਦੇ ਭਾਰ ਲੇਟ ਜਾਓ। ਸਿੱਧੀ ਲੱਤ ਉਠਾਉਣਾ ਸ਼ੁਰੂ ਕਰੋ। ਆਪਣੀ ਲੱਤ ਨੂੰ ਸਿੱਧੀ ਰੱਖੋ ਅਤੇ ਚੁੱਕੋ।",
      formCues: [
        "ਆਪਣੇ ਗੋਡੇ ਨੂੰ ਲਾਕ ਕਰੋ",
        "ਕੁੱਲ੍ਹੇ ਦੇ ਪੱਧਰ ਤੱਕ ਚੁੱਕੋ",
        "ਹੌਲੀ-ਹੌਲੀ ਹੇਠਾਂ ਲਿਆਓ"
      ]
    }
  },
  4: { // Ankle Pumps
    en: {
      start: "Lie flat on your back. Begin ankle pumps. Point your toes up and down.",
      formCues: [
        "Full range of motion",
        "Flex your ankle completely",
        "Smooth pumping motion"
      ]
    },
    hi: {
      start: "अपनी पीठ के बल लेट जाएं। एंकल पंप शुरू करें। अपने पैर के पंजों को ऊपर और नीचे करें।",
      formCues: [
        "पूरी गति की सीमा",
        "अपने टखने को पूरी तरह से मोड़ें",
        "सुचारू पंपिंग गति"
      ]
    },
    pa: {
      start: "ਆਪਣੀ ਪਿੱਠ ਦੇ ਭਾਰ ਲੇਟ ਜਾਓ। ਐਂਕਲ ਪੰਪ ਸ਼ੁਰੂ ਕਰੋ। ਆਪਣੇ ਪੈਰਾਂ ਦੀਆਂ ਉਂਗਲਾਂ ਨੂੰ ਉੱਪਰ ਅਤੇ ਹੇਠਾਂ ਕਰੋ।",
      formCues: [
        "ਪੂਰੀ ਗਤੀ ਦੀ ਸੀਮਾ",
        "ਆਪਣੇ ਗਿੱਟੇ ਨੂੰ ਪੂਰੀ ਤਰ੍ਹਾਂ ਮੋੜੋ",
        "ਨਿਰਵਿਘਨ ਪੰਪਿੰਗ ਗਤੀ"
      ]
    }
  },
  5: { // Short Arc Quads
    en: {
      start: "Lie flat on your back with a roll under your knee. Begin short arc quads. Straighten your knee over the roll.",
      formCues: [
        "Keep your thigh on the roll",
        "Lift your foot up",
        "Squeeze at the top"
      ]
    },
    hi: {
      start: "अपने घुटने के नीचे एक रोल रखकर पीठ के बल लेट जाएं। शॉर्ट आर्क क्वाड्स शुरू करें। रोल के ऊपर अपने घुटने को सीधा करें।",
      formCues: [
        "अपनी जांघ को रोल पर रखें",
        "अपना पैर ऊपर उठाएं",
        "ऊपर पहुंचकर दबाएं"
      ]
    },
    pa: {
      start: "ਆਪਣੇ ਗੋਡੇ ਦੇ ਹੇਠਾਂ ਇੱਕ ਰੋਲ ਰੱਖ ਕੇ ਪਿੱਠ ਦੇ ਭਾਰ ਲੇਟ ਜਾਓ। ਸ਼ਾਰਟ ਆਰਕ ਕੁਆਡਸ ਸ਼ੁਰੂ ਕਰੋ। ਰੋਲ ਦੇ ਉੱਪਰ ਆਪਣੇ ਗੋਡੇ ਨੂੰ ਸਿੱਧਾ ਕਰੋ।",
      formCues: [
        "ਆਪਣੀ ਪੱਟ ਨੂੰ ਰੋਲ 'ਤੇ ਰੱਖੋ",
        "ਆਪਣਾ ਪੈਰ ਉੱਪਰ ਚੁੱਕੋ",
        "ਸਿਖਰ 'ਤੇ ਦਬਾਓ"
      ]
    }
  },
  6: { // Hamstring Curls
    en: {
      start: "Stand upright holding a support if needed. Begin hamstring curls. Bend your knee and bring your heel towards your buttocks.",
      formCues: [
        "Keep your hip stable",
        "Controlled bending motion",
        "Squeeze your hamstring"
      ]
    },
    hi: {
      start: "यदि जरूरत हो तो सहारा पकड़कर सीधे खड़े हों। हैमस्ट्रिंग कर्ल शुरू करें। अपना घुटना मोड़ें और अपनी एड़ी को नितंबों की ओर ले जाएं।",
      formCues: [
        "अपने कूल्हे को स्थिर रखें",
        "नियंत्रित मोड़ने की गति",
        "अपनी हैमस्ट्रिंग को दबाएं"
      ]
    },
    pa: {
      start: "ਜੇ ਲੋੜ ਹੋਵੇ ਤਾਂ ਸਹਾਰਾ ਫੜ ਕੇ ਸਿੱਧੇ ਖੜ੍ਹੇ ਹੋਵੋ। ਹੈਮਸਟ੍ਰਿੰਗ ਕਰਲ ਸ਼ੁਰੂ ਕਰੋ। ਆਪਣਾ ਗੋਡਾ ਮੋੜੋ ਅਤੇ ਆਪਣੀ ਅੱਡੀ ਨੂੰ ਨਿਤੰਬਾਂ ਵੱਲ ਲੈ ਜਾਓ।",
      formCues: [
        "ਆਪਣੇ ਕੁੱਲ੍ਹੇ ਨੂੰ ਸਥਿਰ ਰੱਖੋ",
        "ਨਿਯੰਤਰਿਤ ਮੋੜਨ ਦੀ ਗਤੀ",
        "ਆਪਣੀ ਹੈਮਸਟ੍ਰਿੰਗ ਨੂੰ ਦਬਾਓ"
      ]
    }
  }
};

// Helper to get guidance in current language
export const getExerciseGuidance = (exerciseId: number) => {
  const lang = voiceGuidance.getLanguage();
  return exerciseGuidance[exerciseId]?.[lang];
};
