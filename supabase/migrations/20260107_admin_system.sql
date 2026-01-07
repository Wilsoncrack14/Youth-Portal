-- Migration: Add admin system tables and roles
-- Created: 2026-01-07

-- 1. Update profiles table to add is_admin field
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin checks
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- 2. Create quarters table
CREATE TABLE IF NOT EXISTS quarters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, quarter)
);

-- RLS for quarters
ALTER TABLE quarters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quarters"
  ON quarters FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert quarters"
  ON quarters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update quarters"
  ON quarters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete quarters"
  ON quarters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 3. Create weeks table
CREATE TABLE IF NOT EXISTS weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quarter_id UUID REFERENCES quarters(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  memory_verse TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quarter_id, week_number)
);

-- RLS for weeks
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view weeks"
  ON weeks FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage weeks"
  ON weeks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 4. Create daily_lessons table
CREATE TABLE IF NOT EXISTS daily_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  bible_verses TEXT[],
  reflection_questions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id, day)
);

-- RLS for daily_lessons
ALTER TABLE daily_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily lessons"
  ON daily_lessons FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage daily lessons"
  ON daily_lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 5. Create lesson_completions table (for user progress tracking)
CREATE TABLE IF NOT EXISTS lesson_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_lesson_id UUID REFERENCES daily_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, daily_lesson_id)
);

-- RLS for lesson_completions
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions"
  ON lesson_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON lesson_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions"
  ON lesson_completions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
  ON lesson_completions FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_quarters_updated_at BEFORE UPDATE ON quarters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weeks_updated_at BEFORE UPDATE ON weeks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_lessons_updated_at BEFORE UPDATE ON daily_lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weeks_quarter ON weeks(quarter_id);
CREATE INDEX IF NOT EXISTS idx_daily_lessons_week ON daily_lessons(week_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson ON lesson_completions(daily_lesson_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Admin system tables created successfully!';
END $$;
