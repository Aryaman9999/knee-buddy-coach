export class VoiceGuidanceService {
  private synth: SpeechSynthesis;
  private isSpeaking: boolean = false;
  private queue: string[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  speak(text: string, interrupt: boolean = false) {
    if (!this.isEnabled) return;

    if (interrupt) {
      this.synth.cancel();
      this.queue = [];
      this.isSpeaking = false;
    }

    if (this.isSpeaking && !interrupt) {
      this.queue.push(text);
      return;
    }

    this.speakNow(text);
  }

  private speakNow(text: string) {
    this.isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

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

// Exercise-specific guidance
export const exerciseGuidance = {
  1: { // Heel Slides
    start: "Lie flat on your back. Begin heel slides. Slide your heel towards your buttocks, then back out.",
    formCues: [
      "Keep your knee aligned",
      "Smooth controlled motion",
      "Don't rush the movement"
    ]
  },
  2: { // Quad Sets
    start: "Sit in a chair with your back supported. Begin quad sets. Tighten your thigh muscle and hold.",
    formCues: [
      "Squeeze your thigh muscle",
      "Hold for three seconds",
      "Keep your leg straight"
    ]
  },
  3: { // Straight Leg Raises
    start: "Lie flat on your back. Begin straight leg raises. Keep your leg straight and lift.",
    formCues: [
      "Lock your knee",
      "Lift to hip level",
      "Lower slowly"
    ]
  },
  4: { // Ankle Pumps
    start: "Lie flat on your back. Begin ankle pumps. Point your toes up and down.",
    formCues: [
      "Full range of motion",
      "Flex your ankle completely",
      "Smooth pumping motion"
    ]
  },
  5: { // Short Arc Quads
    start: "Lie flat on your back with a roll under your knee. Begin short arc quads. Straighten your knee over the roll.",
    formCues: [
      "Keep your thigh on the roll",
      "Lift your foot up",
      "Squeeze at the top"
    ]
  },
  6: { // Hamstring Curls
    start: "Stand upright holding a support if needed. Begin hamstring curls. Bend your knee and bring your heel towards your buttocks.",
    formCues: [
      "Keep your hip stable",
      "Controlled bending motion",
      "Squeeze your hamstring"
    ]
  }
};
