// Real-Time Coaching Engine
// Provides angle-based feedback, pace tracking, and breathing cues
// Runs locally on every sensor update — no API calls

export type CoachingPriority = 'safety' | 'correction' | 'angle' | 'pace' | 'breathing' | 'encouragement';

export interface CoachingMessage {
    text: string;
    priority: CoachingPriority;
}

interface ExerciseBreathingPattern {
    onFlex: string; // What to say when entering flexed state
    onExtend: string; // What to say when entering extended state
}

// Exercise-specific breathing patterns
const breathingPatterns: Record<number, ExerciseBreathingPattern> = {
    1: { onFlex: "Breathe out as you slide your heel in", onExtend: "Breathe in as you straighten" },
    2: { onFlex: "Breathe out and squeeze", onExtend: "Breathe in and relax" },
    3: { onFlex: "Breathe out as you lift", onExtend: "Breathe in as you lower" },
    4: { onFlex: "Breathe out, toes up", onExtend: "Breathe in, toes down" },
    5: { onFlex: "Breathe in, relax the knee", onExtend: "Breathe out as you straighten" },
    6: { onFlex: "Breathe out as you curl", onExtend: "Breathe in as you lower" },
    7: { onFlex: "Breathe out as you lift your leg", onExtend: "Breathe in as you bring it back" },
    8: { onFlex: "Breathe in, bend the knee", onExtend: "Breathe out as you extend" },
};

export class RealtimeCoachingEngine {
    // Cooldown timers (ms since last message of each type)
    private lastAngleFeedbackTime: number = 0;
    private lastPaceFeedbackTime: number = 0;
    private lastBreathingCueTime: number = 0;
    private lastEncouragementTime: number = 0;

    // Cooldown durations (ms)
    private readonly ANGLE_COOLDOWN = 4000;
    private readonly PACE_COOLDOWN = 10000;
    private readonly BREATHING_COOLDOWN = 6000; // Roughly every other rep
    private readonly ENCOURAGEMENT_COOLDOWN = 15000;

    // Pace tracking
    private repTimestamps: number[] = [];
    private readonly MAX_PACE_WINDOW = 6; // Track last N reps for pace analysis

    // Angle milestone tracking
    private hasAnnouncedHalfway: boolean = false;
    private hasAnnouncedNearTarget: boolean = false;
    private hasAnnouncedTargetReached: boolean = false;

    // Rep tracking for breathing
    private lastRepForBreathing: number = 0;
    private lastRepStateForBreathing: 'flexed' | 'extended' = 'extended';

    /**
     * Reset engine state (call when starting a new exercise or set)
     */
    reset() {
        this.lastAngleFeedbackTime = 0;
        this.lastPaceFeedbackTime = 0;
        this.lastBreathingCueTime = 0;
        this.lastEncouragementTime = 0;
        this.repTimestamps = [];
        this.hasAnnouncedHalfway = false;
        this.hasAnnouncedNearTarget = false;
        this.hasAnnouncedTargetReached = false;
        this.lastRepForBreathing = 0;
        this.lastRepStateForBreathing = 'extended';
    }

    /**
     * Process a sensor update and return any coaching messages to speak.
     * Returns an array (usually 0-1 messages) sorted by priority.
     */
    processSensorUpdate(params: {
        exerciseId: number;
        currentAngle: number;
        targetAngle: number;
        repState: 'flexed' | 'extended';
        currentRep: number;
        totalReps: number;
        currentSet: number;
        totalSets: number;
    }): CoachingMessage[] {
        const messages: CoachingMessage[] = [];
        const now = Date.now();
        const {
            exerciseId, currentAngle, targetAngle,
            repState, currentRep, totalReps,
            currentSet, totalSets
        } = params;

        // --- 1. ANGLE-BASED FEEDBACK ---
        if (now - this.lastAngleFeedbackTime >= this.ANGLE_COOLDOWN && targetAngle > 0) {
            const angleDiff = targetAngle - currentAngle;
            const anglePercent = (currentAngle / targetAngle) * 100;

            // Target reached
            if (anglePercent >= 95 && !this.hasAnnouncedTargetReached) {
                messages.push({
                    text: "You've reached the target angle! Great range of motion!",
                    priority: 'angle'
                });
                this.hasAnnouncedTargetReached = true;
                this.lastAngleFeedbackTime = now;
            }
            // Near target (within 15 degrees)
            else if (angleDiff > 0 && angleDiff <= 15 && !this.hasAnnouncedNearTarget && repState === 'flexed') {
                messages.push({
                    text: `Almost there! Just ${Math.round(angleDiff)} more degrees.`,
                    priority: 'angle'
                });
                this.hasAnnouncedNearTarget = true;
                this.lastAngleFeedbackTime = now;
            }
            // Halfway encouragement
            else if (anglePercent >= 45 && anglePercent < 55 && !this.hasAnnouncedHalfway && repState === 'flexed') {
                messages.push({
                    text: "Halfway to target, keep going!",
                    priority: 'angle'
                });
                this.hasAnnouncedHalfway = true;
                this.lastAngleFeedbackTime = now;
            }
            // Active guidance when in flexion and not yet at target
            else if (repState === 'flexed' && angleDiff > 15 && currentAngle > 10) {
                messages.push({
                    text: `Bend ${Math.round(angleDiff)} more degrees to reach target.`,
                    priority: 'angle'
                });
                this.lastAngleFeedbackTime = now;
            }
        }

        // Reset milestone tracking when returning to extended
        if (repState === 'extended' && this.lastRepStateForBreathing === 'flexed') {
            this.hasAnnouncedHalfway = false;
            this.hasAnnouncedNearTarget = false;
            this.hasAnnouncedTargetReached = false;
        }

        // --- 2. BREATHING CUES ---
        if (now - this.lastBreathingCueTime >= this.BREATHING_COOLDOWN) {
            const pattern = breathingPatterns[exerciseId];
            if (pattern) {
                // Trigger on state transitions
                if (repState === 'flexed' && this.lastRepStateForBreathing === 'extended') {
                    messages.push({ text: pattern.onFlex, priority: 'breathing' });
                    this.lastBreathingCueTime = now;
                } else if (repState === 'extended' && this.lastRepStateForBreathing === 'flexed') {
                    messages.push({ text: pattern.onExtend, priority: 'breathing' });
                    this.lastBreathingCueTime = now;
                }
            }
        }

        // Update last state
        this.lastRepStateForBreathing = repState;

        // --- 3. PACE TRACKING (called on rep completion) ---
        // This is triggered externally via onRepCompleted()

        // --- 4. SET/EXERCISE ENCOURAGEMENT ---
        if (now - this.lastEncouragementTime >= this.ENCOURAGEMENT_COOLDOWN) {
            // Approaching end of set
            if (currentRep > 0 && totalReps - currentRep === 3) {
                messages.push({
                    text: "Just 3 more reps! Push through!",
                    priority: 'encouragement'
                });
                this.lastEncouragementTime = now;
            }
            // Last set
            else if (currentSet === totalSets && currentRep === 1) {
                messages.push({
                    text: "Last set! Give it everything you've got!",
                    priority: 'encouragement'
                });
                this.lastEncouragementTime = now;
            }
        }

        // Return only the highest priority message to avoid overwhelming
        if (messages.length > 1) {
            messages.sort((a, b) => this.getPriorityRank(a.priority) - this.getPriorityRank(b.priority));
            return [messages[0]];
        }

        return messages;
    }

    /**
     * Call this when a rep is completed to track pace.
     */
    onRepCompleted(): CoachingMessage | null {
        const now = Date.now();
        this.repTimestamps.push(now);

        // Keep only the last N timestamps
        if (this.repTimestamps.length > this.MAX_PACE_WINDOW) {
            this.repTimestamps.shift();
        }

        // Need at least 3 reps to analyze pace
        if (this.repTimestamps.length < 3 || now - this.lastPaceFeedbackTime < this.PACE_COOLDOWN) {
            return null;
        }

        // Calculate intervals
        const intervals: number[] = [];
        for (let i = 1; i < this.repTimestamps.length; i++) {
            intervals.push(this.repTimestamps[i] - this.repTimestamps[i - 1]);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const lastInterval = intervals[intervals.length - 1];

        // Detect speeding up (last rep was 40%+ faster than average)
        if (lastInterval < avgInterval * 0.6) {
            this.lastPaceFeedbackTime = now;
            return {
                text: "You're speeding up. Try to keep a steady, controlled pace.",
                priority: 'pace'
            };
        }

        // Detect good consistency
        const variance = intervals.reduce((sum, i) => sum + Math.abs(i - avgInterval), 0) / intervals.length;
        if (variance < avgInterval * 0.15 && intervals.length >= 4) {
            this.lastPaceFeedbackTime = now;
            return {
                text: "Great consistent pace! Keep it up.",
                priority: 'pace'
            };
        }

        return null;
    }

    private getPriorityRank(p: CoachingPriority): number {
        const ranks: Record<CoachingPriority, number> = {
            safety: 0,
            correction: 1,
            angle: 2,
            pace: 3,
            breathing: 4,
            encouragement: 5,
        };
        return ranks[p];
    }
}

export const realtimeCoachingEngine = new RealtimeCoachingEngine();
