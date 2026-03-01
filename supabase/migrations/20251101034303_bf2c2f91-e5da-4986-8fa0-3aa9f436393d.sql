-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create weekly_checkins table
CREATE TABLE public.weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Questionnaire scores (0-10 scale)
  pain_score INTEGER CHECK (pain_score >= 0 AND pain_score <= 10),
  stiffness_score INTEGER CHECK (stiffness_score >= 0 AND stiffness_score <= 10),
  
  -- Gait test reference
  gait_test_id UUID REFERENCES public.gait_tests(id) ON DELETE SET NULL,
  
  -- Recommended exercise for this week
  recommended_exercise_id TEXT,
  
  -- Next allowed check-in date (7 days from current)
  next_checkin_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on weekly_checkins
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

-- Weekly check-ins policies
CREATE POLICY "Users can view their own check-ins"
  ON public.weekly_checkins
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check-ins"
  ON public.weekly_checkins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_weekly_checkins_user_date ON public.weekly_checkins(user_id, checkin_date DESC);

-- Function to check if user can perform weekly check-in
CREATE OR REPLACE FUNCTION public.can_checkin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT next_checkin_date <= NOW()
     FROM public.weekly_checkins
     WHERE user_id = _user_id
     ORDER BY checkin_date DESC
     LIMIT 1),
    TRUE
  );
$$;

-- Function to get days until next check-in
CREATE OR REPLACE FUNCTION public.days_until_checkin(_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    GREATEST(0, EXTRACT(DAY FROM (next_checkin_date - NOW()))::INTEGER),
    0
  )
  FROM public.weekly_checkins
  WHERE user_id = _user_id
  ORDER BY checkin_date DESC
  LIMIT 1;
$$;

-- Trigger function to update profiles updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();