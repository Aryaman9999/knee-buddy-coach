export interface GaitMetrics {
  rightKneeROM: number;
  leftKneeROM: number;
  asymmetryScore: number;
  lateralStabilityScore: number;
  weightDistributionScore: number; // New metric for weight imbalance
  stepCount: number;
  testDuration: number;
  averageRightKnee: number;
  averageLeftKnee: number;
  averageRightWeight: number; // Average weight on right heel
  averageLeftWeight: number;  // Average weight on left heel
}

export type DiagnosisType = 
  | 'LIMITED_ROM_RIGHT' 
  | 'LIMITED_ROM_LEFT' 
  | 'ASYMMETRIC_GAIT' 
  | 'UNSTABLE_KNEE'
  | 'WEIGHT_IMBALANCE'
  | 'NORMAL';

export type SeverityLevel = 'normal' | 'mild' | 'moderate' | 'severe';

export interface GaitDiagnosis {
  type: DiagnosisType;
  severity: SeverityLevel;
  description: string;
  affectedSide?: 'left' | 'right' | 'both';
}

export interface RecommendedExercise {
  exerciseId: string;
  exerciseName: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface GaitAnalysisResult {
  metrics: GaitMetrics;
  diagnoses: GaitDiagnosis[];
  recommendations: RecommendedExercise[];
  timestamp: number;
  overallStatus: 'good' | 'fair' | 'needs_attention';
}

export type GaitTestPhase = 
  | 'connect' 
  | 'calibrate' 
  | 'ready'
  | 'walking' 
  | 'analyzing' 
  | 'results';

export interface GaitTestState {
  phase: GaitTestPhase;
  progress: number;
  stepCount: number;
  message: string;
  isComplete: boolean;
}
