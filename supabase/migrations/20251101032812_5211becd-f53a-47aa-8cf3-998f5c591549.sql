-- Create gait_tests table to store gait analysis results
CREATE TABLE IF NOT EXISTS public.gait_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metrics
  right_knee_rom DECIMAL,
  left_knee_rom DECIMAL,
  asymmetry_score DECIMAL,
  lateral_stability_score DECIMAL,
  step_count INTEGER,
  test_duration DECIMAL,
  
  -- Analysis results
  diagnoses JSONB,
  recommended_exercises JSONB,
  overall_status TEXT,
  
  -- Raw data (optional, for detailed review)
  sensor_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gait_tests ENABLE ROW LEVEL SECURITY;

-- Policies for gait_tests
CREATE POLICY "Users can view their own gait tests"
  ON public.gait_tests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gait tests"
  ON public.gait_tests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_gait_tests_user_id ON public.gait_tests(user_id);
CREATE INDEX idx_gait_tests_test_date ON public.gait_tests(test_date DESC);