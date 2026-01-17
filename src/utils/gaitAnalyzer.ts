import { SensorPacket, Quaternion } from '@/types/sensorData';
import { sensorDataMapper } from './sensorDataMapper';
import { 
  GaitMetrics, 
  GaitDiagnosis, 
  GaitAnalysisResult, 
  RecommendedExercise,
  DiagnosisType,
  SeverityLevel
} from '@/types/gaitAnalysis';
import { Euler, Quaternion as ThreeQuaternion } from 'three';

// Standard gait parameters
const NORMAL_ROM_MIN = 50; // Minimum normal knee ROM in degrees
const NORMAL_ROM_TARGET = 65; // Target knee ROM for walking
const ASYMMETRY_THRESHOLD_MILD = 10; // degrees
const ASYMMETRY_THRESHOLD_MODERATE = 15; // degrees
const LATERAL_STABILITY_THRESHOLD = 0.25; // radians std dev
const STEP_DETECTION_THRESHOLD = 0.15; // radians for pelvis pitch change
const WEIGHT_IMBALANCE_THRESHOLD_MILD = 15; // % difference in weight distribution
const WEIGHT_IMBALANCE_THRESHOLD_MODERATE = 25; // % difference in weight distribution

export class GaitAnalyzer {
  private sensorHistory: SensorPacket[] = [];
  private startTime: number = 0;
  private lastPelvisPitch: number = 0;
  private stepCount: number = 0;
  private weightHistory: { left: number[]; right: number[] } = { left: [], right: [] };

  reset() {
    this.sensorHistory = [];
    this.startTime = Date.now();
    this.stepCount = 0;
    this.lastPelvisPitch = 0;
    this.weightHistory = { left: [], right: [] };
  }

  collectGaitData(packet: SensorPacket): number {
    if (!sensorDataMapper.isValidPacket(packet)) {
      return this.stepCount;
    }

    this.sensorHistory.push(packet);
    
    // Collect weight data with smoothing
    this.weightHistory.left.push(packet.left_wt);
    this.weightHistory.right.push(packet.right_wt);

    // Detect steps from pelvis movement
    const pelvisQ = sensorDataMapper.toThreeQuaternion(packet.sensors.pelvis);
    const euler = new Euler().setFromQuaternion(pelvisQ);
    const currentPitch = euler.x;

    // Detect peak (step) when pitch crosses threshold
    if (this.sensorHistory.length > 1) {
      const pitchDiff = Math.abs(currentPitch - this.lastPelvisPitch);
      if (pitchDiff > STEP_DETECTION_THRESHOLD && 
          currentPitch > this.lastPelvisPitch) {
        this.stepCount++;
      }
    }

    this.lastPelvisPitch = currentPitch;
    return this.stepCount;
  }

  analyzeRangeOfMotion(): { right: number; left: number } {
    const rightAngles: number[] = [];
    const leftAngles: number[] = [];

    this.sensorHistory.forEach(packet => {
      const rightAngle = sensorDataMapper.calculateJointAngle(
        packet.sensors.right_thigh,
        packet.sensors.right_shin
      );
      const leftAngle = sensorDataMapper.calculateJointAngle(
        packet.sensors.left_thigh,
        packet.sensors.left_shin
      );

      rightAngles.push(rightAngle);
      leftAngles.push(leftAngle);
    });

    const rightROM = Math.max(...rightAngles) - Math.min(...rightAngles);
    const leftROM = Math.max(...leftAngles) - Math.min(...leftAngles);

    return { right: rightROM, left: leftROM };
  }

  analyzeAsymmetry(): { score: number; avgRight: number; avgLeft: number } {
    const rightAngles: number[] = [];
    const leftAngles: number[] = [];

    this.sensorHistory.forEach(packet => {
      const rightAngle = sensorDataMapper.calculateJointAngle(
        packet.sensors.right_thigh,
        packet.sensors.right_shin
      );
      const leftAngle = sensorDataMapper.calculateJointAngle(
        packet.sensors.left_thigh,
        packet.sensors.left_shin
      );

      rightAngles.push(rightAngle);
      leftAngles.push(leftAngle);
    });

    // Calculate ROM for each leg
    const rightROM = Math.max(...rightAngles) - Math.min(...rightAngles);
    const leftROM = Math.max(...leftAngles) - Math.min(...leftAngles);
    
    // Asymmetry score based on ROM difference (better metric than average angle)
    const score = Math.abs(rightROM - leftROM);
    
    const avgRight = rightAngles.reduce((a, b) => a + b, 0) / rightAngles.length;
    const avgLeft = leftAngles.reduce((a, b) => a + b, 0) / leftAngles.length;

    return { score, avgRight, avgLeft };
  }

  analyzeLateralStability(): number {
    const lateralMovements: number[] = [];

    this.sensorHistory.forEach(packet => {
      // Analyze both thighs for lateral stability
      const rightThighQ = sensorDataMapper.toThreeQuaternion(packet.sensors.right_thigh);
      const leftThighQ = sensorDataMapper.toThreeQuaternion(packet.sensors.left_thigh);

      const rightEuler = new Euler().setFromQuaternion(rightThighQ);
      const leftEuler = new Euler().setFromQuaternion(leftThighQ);

      // Y and Z rotations indicate lateral movement (abduction/adduction, rotation)
      const rightLateral = Math.sqrt(rightEuler.y ** 2 + rightEuler.z ** 2);
      const leftLateral = Math.sqrt(leftEuler.y ** 2 + leftEuler.z ** 2);

      lateralMovements.push(rightLateral);
      lateralMovements.push(leftLateral);
    });

    // Calculate standard deviation as stability metric
    const mean = lateralMovements.reduce((a, b) => a + b, 0) / lateralMovements.length;
    const variance = lateralMovements.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lateralMovements.length;
    const stdDev = Math.sqrt(variance);

    return stdDev;
  }

  analyzeWeightDistribution(): { score: number; avgRight: number; avgLeft: number } {
    if (this.weightHistory.left.length === 0 || this.weightHistory.right.length === 0) {
      return { score: 0, avgRight: 0, avgLeft: 0 };
    }

    // Apply moving average filter to smooth weight data
    const smoothWindow = 5;
    const smoothWeight = (data: number[]): number[] => {
      const smoothed: number[] = [];
      for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - smoothWindow + 1);
        const window = data.slice(start, i + 1);
        const avg = window.reduce((a, b) => a + b, 0) / window.length;
        smoothed.push(avg);
      }
      return smoothed;
    };

    const smoothedLeft = smoothWeight(this.weightHistory.left);
    const smoothedRight = smoothWeight(this.weightHistory.right);

    // Calculate average weight distribution
    const avgLeft = smoothedLeft.reduce((a, b) => a + b, 0) / smoothedLeft.length;
    const avgRight = smoothedRight.reduce((a, b) => a + b, 0) / smoothedRight.length;

    // Calculate percentage difference
    const totalAvg = avgLeft + avgRight;
    const leftPercent = (avgLeft / totalAvg) * 100;
    const rightPercent = (avgRight / totalAvg) * 100;
    const score = Math.abs(leftPercent - rightPercent);

    return { score, avgRight, avgLeft };
  }

  generateDiagnosis(metrics: GaitMetrics): GaitDiagnosis[] {
    const diagnoses: GaitDiagnosis[] = [];

    // Check ROM
    if (metrics.rightKneeROM < NORMAL_ROM_MIN) {
      const severity: SeverityLevel = 
        metrics.rightKneeROM < 40 ? 'severe' : 
        metrics.rightKneeROM < 45 ? 'moderate' : 'mild';
      
      diagnoses.push({
        type: 'LIMITED_ROM_RIGHT',
        severity,
        description: `Right knee shows limited range of motion (${metrics.rightKneeROM.toFixed(1)}° vs ${NORMAL_ROM_TARGET}° target)`,
        affectedSide: 'right'
      });
    }

    if (metrics.leftKneeROM < NORMAL_ROM_MIN) {
      const severity: SeverityLevel = 
        metrics.leftKneeROM < 40 ? 'severe' : 
        metrics.leftKneeROM < 45 ? 'moderate' : 'mild';
      
      diagnoses.push({
        type: 'LIMITED_ROM_LEFT',
        severity,
        description: `Left knee shows limited range of motion (${metrics.leftKneeROM.toFixed(1)}° vs ${NORMAL_ROM_TARGET}° target)`,
        affectedSide: 'left'
      });
    }

    // Check asymmetry
    if (metrics.asymmetryScore > ASYMMETRY_THRESHOLD_MILD) {
      const severity: SeverityLevel = 
        metrics.asymmetryScore > ASYMMETRY_THRESHOLD_MODERATE ? 'moderate' : 'mild';
      
      diagnoses.push({
        type: 'ASYMMETRIC_GAIT',
        severity,
        description: `Asymmetric gait pattern detected (${metrics.asymmetryScore.toFixed(1)}° difference between legs)`,
        affectedSide: 'both'
      });
    }

    // Check lateral stability
    if (metrics.lateralStabilityScore > LATERAL_STABILITY_THRESHOLD) {
      const severity: SeverityLevel = 
        metrics.lateralStabilityScore > LATERAL_STABILITY_THRESHOLD * 1.5 ? 'moderate' : 'mild';
      
      diagnoses.push({
        type: 'UNSTABLE_KNEE',
        severity,
        description: 'Excessive lateral knee movement detected, indicating instability',
        affectedSide: 'both'
      });
    }

    // If no issues found
    if (diagnoses.length === 0) {
      diagnoses.push({
        type: 'NORMAL',
        severity: 'normal',
        description: 'Gait pattern within normal parameters'
      });
    }

    // Check weight distribution imbalance
    if (metrics.weightDistributionScore > WEIGHT_IMBALANCE_THRESHOLD_MILD) {
      const severity: SeverityLevel = 
        metrics.weightDistributionScore > WEIGHT_IMBALANCE_THRESHOLD_MODERATE ? 'moderate' : 'mild';
      
      const heavierSide = metrics.averageRightWeight > metrics.averageLeftWeight ? 'right' : 'left';
      
      diagnoses.push({
        type: 'WEIGHT_IMBALANCE',
        severity,
        description: `Uneven weight distribution detected (${metrics.weightDistributionScore.toFixed(1)}% imbalance, favoring ${heavierSide} side)`,
        affectedSide: 'both'
      });
    }

    return diagnoses;
  }

  recommendExercises(diagnoses: GaitDiagnosis[]): RecommendedExercise[] {
    const recommendations: RecommendedExercise[] = [];
    const exerciseMap = new Map<string, RecommendedExercise>();

    diagnoses.forEach(diagnosis => {
      switch (diagnosis.type) {
        case 'LIMITED_ROM_RIGHT':
        case 'LIMITED_ROM_LEFT':
          exerciseMap.set('1', {
            exerciseId: '1',
            exerciseName: 'Heel Slides',
            reason: 'Improves knee flexion range of motion through controlled movement',
            priority: 'high'
          });
          exerciseMap.set('5', {
            exerciseId: '5',
            exerciseName: 'Short Arc Quads',
            reason: 'Strengthens quadriceps while working through limited ROM',
            priority: 'high'
          });
          break;

        case 'ASYMMETRIC_GAIT':
          exerciseMap.set('3', {
            exerciseId: '3',
            exerciseName: 'Straight Leg Raises',
            reason: 'Builds unilateral strength to correct muscle imbalances',
            priority: 'medium'
          });
          exerciseMap.set('2', {
            exerciseId: '2',
            exerciseName: 'Quad Sets',
            reason: 'Improves muscle activation symmetry',
            priority: 'medium'
          });
          break;

        case 'UNSTABLE_KNEE':
          exerciseMap.set('6', {
            exerciseId: '6',
            exerciseName: 'Hamstring Curls',
            reason: 'Strengthens hamstrings for better knee stability and control',
            priority: 'high'
          });
          exerciseMap.set('2', {
            exerciseId: '2',
            exerciseName: 'Quad Sets',
            reason: 'Improves muscle control and joint stability',
            priority: 'medium'
          });
          break;

        case 'WEIGHT_IMBALANCE':
          exerciseMap.set('3', {
            exerciseId: '3',
            exerciseName: 'Straight Leg Raises',
            reason: 'Improves single-leg strength to correct weight distribution imbalance',
            priority: 'high'
          });
          exerciseMap.set('1', {
            exerciseId: '1',
            exerciseName: 'Heel Slides',
            reason: 'Helps restore balanced movement patterns',
            priority: 'medium'
          });
          break;
      }
    });

    // Convert map to array and sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    recommendations.push(...Array.from(exerciseMap.values()));
    recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    return recommendations;
  }

  analyze(): GaitAnalysisResult {
    const rom = this.analyzeRangeOfMotion();
    const asymmetry = this.analyzeAsymmetry();
    const lateralStability = this.analyzeLateralStability();
    const weightDistribution = this.analyzeWeightDistribution();
    const testDuration = (Date.now() - this.startTime) / 1000;

    const metrics: GaitMetrics = {
      rightKneeROM: rom.right,
      leftKneeROM: rom.left,
      asymmetryScore: asymmetry.score,
      lateralStabilityScore: lateralStability,
      weightDistributionScore: weightDistribution.score,
      stepCount: this.stepCount,
      testDuration,
      averageRightKnee: asymmetry.avgRight,
      averageLeftKnee: asymmetry.avgLeft,
      averageRightWeight: weightDistribution.avgRight,
      averageLeftWeight: weightDistribution.avgLeft
    };

    const diagnoses = this.generateDiagnosis(metrics);
    const recommendations = this.recommendExercises(diagnoses);

    // Determine overall status
    const hasSevere = diagnoses.some(d => d.severity === 'severe');
    const hasModerate = diagnoses.some(d => d.severity === 'moderate');
    const overallStatus = hasSevere ? 'needs_attention' : hasModerate ? 'fair' : 'good';

    return {
      metrics,
      diagnoses,
      recommendations,
      timestamp: Date.now(),
      overallStatus
    };
  }

  getDataCount(): number {
    return this.sensorHistory.length;
  }

  getStepCount(): number {
    return this.stepCount;
  }
}

export const gaitAnalyzer = new GaitAnalyzer();
