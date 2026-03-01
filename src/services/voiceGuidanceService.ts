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

// Exercise-specific guidance with corrections
export interface ExerciseGuidanceEntry {
  start: string;
  formCues: string[];
  corrections: {
    tooShallow: string;
    tooFast: string;
    notFullExtension: string;
    holdLonger?: string;
    specific?: string[];
  };
  completionMessage: string;
}

export const exerciseGuidance: Record<number, ExerciseGuidanceEntry> = {
  1: { // Heel Slides
    start: "Lie flat on your back with both legs extended. Begin heel slides. Slowly slide your heel towards your buttocks, bending your knee, then slide it back out straight.",
    formCues: [
      "Great form, keep it up!",
      "Smooth controlled motion!",
      "Excellent movement!",
      "Perfect technique!",
      "Nice and steady!"
    ],
    corrections: {
      tooShallow: "Bend your knee more. Try to slide your heel further towards your buttocks.",
      tooFast: "Slow down. Control the movement, don't rush it.",
      notFullExtension: "Straighten your leg completely before starting the next rep.",
      specific: [
        "Keep your heel in contact with the bed the entire time.",
        "Don't lift your hip off the bed.",
        "Keep your other leg relaxed and flat."
      ]
    },
    completionMessage: "Great job on the heel slides! Your knee mobility is improving."
  },
  2: { // Quad Sets
    start: "Lie flat on your back with both legs extended and relaxed. Keep your heel on the bed. Tighten your thigh muscle and push the back of your knee down toward the bed. Hold for 3 seconds, then relax.",
    formCues: [
      "Good contraction, hold it!",
      "Push that knee down firmly!",
      "Excellent quad activation!",
      "Feel the muscle tighten!",
      "Great hold!"
    ],
    corrections: {
      tooShallow: "Tighten your thigh harder. You should see your kneecap pull upward.",
      tooFast: "Hold the contraction longer. Push and hold for at least 3 seconds.",
      notFullExtension: "Relax your thigh completely between contractions.",
      holdLonger: "Hold the squeeze longer. Try to maintain the contraction for a full 3 seconds.",
      specific: [
        "Press the back of your knee firmly into the bed.",
        "Your kneecap should lift slightly when you squeeze.",
        "Keep your toes pointed toward the ceiling."
      ]
    },
    completionMessage: "Excellent quad sets! Your quadriceps are getting stronger."
  },
  3: { // Straight Leg Raises
    start: "Lie flat on your back. Lock your knee completely straight. Lift your entire leg up to about 45 degrees, hold briefly, then lower it slowly.",
    formCues: [
      "Great lift!",
      "Keep that knee locked!",
      "Nice controlled lowering!",
      "Perfect height!",
      "Smooth movement!"
    ],
    corrections: {
      tooShallow: "Lift your leg higher. Try to reach about 45 degrees from the bed.",
      tooFast: "Slow down, especially when lowering. Control the descent.",
      notFullExtension: "Lock your knee straight before lifting. No bending allowed.",
      specific: [
        "Keep your knee completely locked, no bending.",
        "Don't arch your lower back off the bed.",
        "Lower your leg slowly, don't let it drop.",
        "Tighten your quad before you start the lift."
      ]
    },
    completionMessage: "Wonderful straight leg raises! Your hip and quad strength is improving."
  },
  4: { // Ankle Pumps
    start: "Lie flat on your back with your legs straight. Begin ankle pumps. Point your toes up toward your shin, then push them down away from you. Keep a steady rhythm.",
    formCues: [
      "Good pumping rhythm!",
      "Full range, nice!",
      "Keep it going!",
      "Great ankle movement!",
      "Steady and smooth!"
    ],
    corrections: {
      tooShallow: "Move your ankle through the full range. Pull your toes up more, then push down more.",
      tooFast: "Slow down a bit. Each pump should be controlled and deliberate.",
      notFullExtension: "Push your toes all the way down before pulling them back up.",
      specific: [
        "Only your foot should move, keep your leg still.",
        "Flex your ankle all the way in both directions.",
        "Imagine pressing a gas pedal, then releasing it fully."
      ]
    },
    completionMessage: "Great ankle pumps! This helps blood circulation and reduces swelling."
  },
  5: { // Short Arc Quads
    start: "Lie flat on your back with a roll placed under your knee for support. Your knee should be slightly bent. Straighten your knee by lifting your foot off the bed, then lower it back down slowly.",
    formCues: [
      "Good extension!",
      "Squeeze at the top!",
      "Nice and controlled!",
      "Full straightening!",
      "Great quad strength!"
    ],
    corrections: {
      tooShallow: "Straighten your knee more. Try to fully extend your lower leg.",
      tooFast: "Slow down. Hold the straight position for a moment before lowering.",
      notFullExtension: "Make sure you fully straighten your knee at the top of each rep.",
      specific: [
        "Keep your thigh resting on the roll, don't lift it.",
        "Squeeze your quad hard at the top of the movement.",
        "Lower your foot slowly, don't just drop it."
      ]
    },
    completionMessage: "Excellent short arc quads! Your terminal knee extension is getting stronger."
  },
  6: { // Hamstring Curls
    start: "Stand upright, holding onto a chair or wall for balance. Begin hamstring curls. Bend your knee to bring your heel toward your buttocks, then lower it back down slowly.",
    formCues: [
      "Good curl!",
      "Nice hamstring squeeze!",
      "Controlled movement!",
      "Great balance!",
      "Smooth and steady!"
    ],
    corrections: {
      tooShallow: "Bend your knee more. Try to bring your heel closer to your buttocks.",
      tooFast: "Slow down. Control both the curling up and the lowering down.",
      notFullExtension: "Straighten your knee fully before the next curl.",
      specific: [
        "Keep your thighs parallel, don't swing your knee forward.",
        "Stand tall, don't lean forward.",
        "Squeeze your hamstring at the top of the curl.",
        "Keep your standing leg slightly bent for stability."
      ]
    },
    completionMessage: "Great hamstring curls! Your hamstring strength and balance are improving."
  },
  7: { // Hip Abduction
    start: "Stand upright, holding onto a chair or wall for support. Begin hip abduction. Lift your leg straight out to the side, keeping your knee straight and toes pointing forward, then lower it back down slowly.",
    formCues: [
      "Good lift to the side!",
      "Nice hip control!",
      "Keep your body upright!",
      "Controlled movement!",
      "Great balance!"
    ],
    corrections: {
      tooShallow: "Lift your leg higher to the side. Aim for about 45 degrees.",
      tooFast: "Slow down. Control the lift and the lowering.",
      notFullExtension: "Bring your leg all the way back to center before lifting again.",
      specific: [
        "Don't lean your torso to the opposite side when lifting.",
        "Keep your toes pointing forward, not upward.",
        "Keep your knee straight throughout the movement.",
        "Stand tall and keep your core tight."
      ]
    },
    completionMessage: "Excellent hip abduction! Your lateral hip strength is improving."
  },
  8: { // Long Arc Quads
    start: "Sit in a chair with your back supported and feet flat on the floor. Begin long arc quads. Straighten your knee fully by lifting your foot up, hold briefly, then lower it back down slowly.",
    formCues: [
      "Full extension, great!",
      "Nice quad squeeze!",
      "Smooth and controlled!",
      "Perfect form!",
      "Hold that extension!"
    ],
    corrections: {
      tooShallow: "Straighten your knee more. Try to fully extend your leg out in front of you.",
      tooFast: "Slow down. Hold the straight position for 2 seconds before lowering.",
      notFullExtension: "Make sure your knee is completely straight at the top.",
      specific: [
        "Don't lean back when extending your leg.",
        "Keep your thigh on the chair, only your lower leg should move.",
        "Squeeze your quadricep hard at full extension.",
        "Lower your foot slowly and with control."
      ]
    },
    completionMessage: "Great long arc quads! Your quadriceps are getting much stronger."
  }
};
