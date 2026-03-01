

## Plan: Enhanced Voice Guidance with Form Corrections + Bilateral Angle Display

### Problem
1. Voice guidance is minimal — only announces rep numbers and generic form cues every 5 reps. No real-time corrective feedback like a physiotherapist would give.
2. The angle display in live mode only shows one angle (the tracked leg). For bilateral exercises or general awareness, the left leg angle is not shown.

### Changes

#### 1. Expand `exerciseGuidance` in `voiceGuidanceService.ts`
Add for all 8 exercises (currently only 6 exist, missing 7 & 8):
- **`start`**: Detailed starting position instruction
- **`formCues`**: Expanded list of positive reinforcement cues
- **`corrections`**: New object mapping specific angle/form issues to corrective voice prompts:
  - `tooShallow` — "Bend more, try to reach the full range"
  - `tooFast` — "Slow down, control the movement"
  - `kneeNotLocked` — exercise-specific (e.g., SLR: "Lock your knee straight")
  - `notFullExtension` — "Straighten your leg completely before the next rep"
  - `holdLonger` — for isometric exercises like Quad Sets
- **`completionMessage`**: Per-exercise completion encouragement

#### 2. Add real-time corrective feedback logic in `ExercisePlayer.tsx`
In the sensor data processing callback:
- Track **rep duration** (time from extended→flexed→extended) to detect "too fast" reps
- Track **peak angle per rep** to detect incomplete ROM ("bend more" / "lift higher")
- If peak angle < 70% of target → voice: exercise-specific shallow correction
- If rep duration < 1.5 seconds → voice: "Slow down, control the movement"
- For Quad Sets (isometric): track hold duration, prompt "Hold longer" if < 2 seconds
- Provide corrective feedback immediately (not just every 5 reps)
- Add a cooldown timer so corrections don't spam (minimum 5 seconds between correction prompts)

#### 3. Track and display both leg angles in `ExercisePlayer.tsx`
- Add `lastLeftAngle` and `lastRightAngle` state variables (replacing single `lastKneeAngle`)
- Calculate both leg angles from sensor data on every packet
- Update the live mode angle overlay to show:
  - **Right Leg: XX°** and **Left Leg: XX°** side by side
  - Highlight the tracked/active leg
  - For bilateral exercises, show both equally

#### 4. Add exercise guidance for exercises 7 & 8
- Hip Abduction (7): corrections for leaning torso, not lifting high enough
- Long Arc Quads (8): corrections for not fully extending knee, rushing

### Technical Details

**New state in ExercisePlayer:**
- `lastLeftAngle: number`, `lastRightAngle: number` — both leg angles
- `repStartTime: number` — timestamp when rep motion begins (for speed detection)
- `peakAngle: number` — max angle reached during current rep (for ROM detection)
- `lastCorrectionTime: number` — cooldown to avoid spamming corrections

**New fields in `exerciseGuidance`:**
```text
corrections: {
  tooShallow: string;    // angle < 70% target
  tooFast: string;       // rep < 1.5s
  notFullExtension: string; // didn't return to start properly
  holdLonger?: string;   // isometric exercises
  specific?: string[];   // exercise-unique corrections
}
```

**Angle display update** — the live mode badge (lines 382-403 in ExercisePlayer) will show two angle readouts instead of one, with labels "R" and "L".

