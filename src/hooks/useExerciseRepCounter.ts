import { useState, useEffect, useRef, useCallback } from "react";
import { SensorPacket } from "@/types/sensorData";
import { bluetoothService } from "@/services/bluetoothService";
import { sensorDataMapper } from "@/utils/sensorDataMapper";
import { exerciseDefinitions } from "@/components/ExerciseAvatar";
import { voiceGuidance, exerciseGuidance, ExerciseGuidanceEntry } from "@/services/voiceGuidanceService";

interface ExerciseInfo {
  id: number;
  reps: number;
  sets: number;
  leg: string;
}

interface RepCounterState {
  currentRep: number;
  currentSet: number;
  feedback: string;
  lastLeftAngle: number;
  lastRightAngle: number;
  repState: 'flexed' | 'extended';
  sensorData: SensorPacket | null;
  exerciseComplete: boolean;
}

export function useExerciseRepCounter(
  exercise: ExerciseInfo | null,
  exercisePhase: string,
  isSensorConnected: boolean,
  isPaused: boolean
) {
  const [currentRep, setCurrentRep] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [feedback, setFeedback] = useState("Watch the demonstration carefully!");
  const [lastLeftAngle, setLastLeftAngle] = useState(0);
  const [lastRightAngle, setLastRightAngle] = useState(0);
  const [repState, setRepState] = useState<'flexed' | 'extended'>('extended');
  const [sensorData, setSensorData] = useState<SensorPacket | null>(null);
  const [exerciseComplete, setExerciseComplete] = useState(false);

  // Correction tracking refs (don't trigger re-renders)
  const lastCorrectionTime = useRef(0);
  const repStartTime = useRef(0);
  const peakAngle = useRef(0);
  const lastRepAnnounced = useRef(0);
  const specificCueIndex = useRef(0);

  const CORRECTION_COOLDOWN_MS = 5000;
  const MIN_REP_DURATION_MS = 1500;

  const speakCorrection = useCallback((text: string) => {
    const now = Date.now();
    if (now - lastCorrectionTime.current >= CORRECTION_COOLDOWN_MS) {
      voiceGuidance.speak(text);
      lastCorrectionTime.current = now;
    }
  }, []);

  useEffect(() => {
    if (!exercise) return;
    const id = exercise.id;
    const idStr = id.toString();

    const unsubscribe = bluetoothService.onDataReceived((data) => {
      setSensorData(data);

      if (exercisePhase !== 'live' || !isSensorConnected || isPaused) return;
      if (!sensorDataMapper.isValidPacket(data)) return;

      const processed = sensorDataMapper.processSensorPacket(data, true);

      // Calculate BOTH leg angles
      const rightThigh = processed.sensors.right_thigh;
      const rightShin = processed.sensors.right_shin;
      const leftThigh = processed.sensors.left_thigh;
      const leftShin = processed.sensors.left_shin;
      const pelvis = processed.sensors.pelvis;

      const exerciseDef = exerciseDefinitions[idStr];
      const measureType = exerciseDef?.measureType || 'knee';

      let rightAngle = 0;
      let leftAngle = 0;

      if (measureType === 'hip') {
        rightAngle = sensorDataMapper.calculateJointAngle(pelvis, rightThigh);
        leftAngle = sensorDataMapper.calculateJointAngle(pelvis, leftThigh);
      } else {
        rightAngle = sensorDataMapper.calculateJointAngle(rightThigh, rightShin);
        leftAngle = sensorDataMapper.calculateJointAngle(leftThigh, leftShin);
      }

      setLastRightAngle(rightAngle);
      setLastLeftAngle(leftAngle);

      // Select tracked angle based on exercise leg
      const usesLeftLeg = exercise.leg === "left";
      const currentAngle = usesLeftLeg ? leftAngle : rightAngle;

      const targetAngle = exerciseDef?.targetAngle || 90;
      const startThreshold = 15;
      const completionThreshold = targetAngle * 0.85;
      const guidance = exerciseGuidance[id];

      // Track peak angle for this rep
      if (currentAngle > peakAngle.current) {
        peakAngle.current = currentAngle;
      }

      console.log(`[REP] angle=${currentAngle.toFixed(1)}° | state=${repState} | threshold=${completionThreshold.toFixed(0)}° | start<${startThreshold}° | peak=${peakAngle.current.toFixed(0)}°`);

      // Rep detection
      if (repState === 'extended' && currentAngle > completionThreshold) {
        setRepState('flexed');
        if (repStartTime.current === 0) {
          repStartTime.current = Date.now();
        }
      } else if (repState === 'flexed' && currentAngle < startThreshold) {
        setRepState('extended');

        const repDuration = Date.now() - repStartTime.current;
        const repPeak = peakAngle.current;

        // Check form corrections BEFORE counting
        if (guidance?.corrections) {
          // Too fast
          if (repDuration > 0 && repDuration < MIN_REP_DURATION_MS) {
            speakCorrection(guidance.corrections.tooFast);
          }
          // Too shallow (peak didn't reach 70% of target)
          else if (repPeak < targetAngle * 0.7 && targetAngle > 0) {
            speakCorrection(guidance.corrections.tooShallow);
          }
        }

        // Reset for next rep
        repStartTime.current = Date.now();
        peakAngle.current = 0;

        // Count the rep
        setCurrentRep((prev) => {
          const nextRep = prev + 1;
          if (nextRep <= exercise.reps) {
            const feedbackMessages = guidance?.formCues || [
              "Great form!", "Keep it up!", "Excellent!", "You're doing great!", "Perfect!"
            ];
            setFeedback(feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)]);
            voiceGuidance.speak(`${nextRep}`);
            lastRepAnnounced.current = nextRep;

            // Specific form cue every 3 reps
            if (nextRep % 3 === 0 && guidance?.corrections.specific) {
              const cues = guidance.corrections.specific;
              const cue = cues[specificCueIndex.current % cues.length];
              specificCueIndex.current++;
              setTimeout(() => speakCorrection(cue), 1200);
            }

            return nextRep;
          } else {
            if (currentSet < exercise.sets) {
              voiceGuidance.speak(`Set ${currentSet} complete. Rest for a moment.`, true);
              setCurrentSet((s) => s + 1);
              lastRepAnnounced.current = 0;
              specificCueIndex.current = 0;
              return 0;
            } else {
              setExerciseComplete(true);
              const msg = guidance?.completionMessage || "Exercise complete! Excellent work!";
              setFeedback(msg);
              voiceGuidance.speak(msg, true);
              return prev;
            }
          }
        });
      }

      // Ongoing corrections during movement (while flexed, check hold for isometric)
      if (repState === 'flexed' && guidance?.corrections.holdLonger) {
        // For isometric exercises (Quad Sets), if they've been in flexed state > 1s but < 2s
        const holdDuration = Date.now() - repStartTime.current;
        if (holdDuration > 1000 && holdDuration < 1500) {
          speakCorrection(guidance.corrections.holdLonger);
        }
      }

      // If angle hasn't moved much and user seems stuck at partial ROM
      if (repState === 'extended' && currentAngle > startThreshold && currentAngle < completionThreshold * 0.5) {
        if (guidance?.corrections) {
          // They started moving but stopped short
          const timeSinceStart = Date.now() - repStartTime.current;
          if (timeSinceStart > 3000) {
            speakCorrection(guidance.corrections.tooShallow);
          }
        }
      }
    });

    return unsubscribe;
  }, [exercisePhase, isSensorConnected, repState, currentSet, exercise, isPaused, speakCorrection]);

  // Show disconnected warning
  useEffect(() => {
    if (exercisePhase === 'live') {
      if (!isSensorConnected) {
        setFeedback("⚠️ WARNING: Sensors disconnected - Reps are NOT being counted. Please reconnect!");
      } else {
        setFeedback(prev =>
          prev.includes('WARNING') || prev.includes('disconnected')
            ? "Let's go! Follow along!"
            : prev
        );
      }
    }
  }, [exercisePhase, isSensorConnected]);

  return {
    currentRep,
    currentSet,
    feedback,
    lastLeftAngle,
    lastRightAngle,
    repState,
    sensorData,
    exerciseComplete,
    setFeedback,
  };
}
