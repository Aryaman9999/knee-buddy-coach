export interface GaitMetrics {
  rightKneeROM: number;
  leftKneeROM: number;
  asymmetryScore: number;
  lateralStabilityScore: number;
  stepCount: number;
  testDuration: number;
  averageRightKnee: number;
  averageLeftKnee: number;
}

export type DiagnosisType = 
  | 'LIMITED_ROM_RIGHT' 
  | 'LIMITED_ROM_LEFT' 
  | 'ASYMMETRIC_GAIT' 
  | 'UNSTABLE_KNEE'
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
