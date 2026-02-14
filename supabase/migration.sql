-- Create yaps table
CREATE TABLE IF NOT EXISTS public.yaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.yaps ENABLE ROW LEVEL SECURITY;

-- Users can only see their own yaps
CREATE POLICY "Users can view own yaps"
  ON public.yaps
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own yaps
CREATE POLICY "Users can create own yaps"
  ON public.yaps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own yaps
CREATE POLICY "Users can update own yaps"
  ON public.yaps
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own yaps
CREATE POLICY "Users can delete own yaps"
  ON public.yaps
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_yaps_user_id ON public.yaps(user_id);

-- Index for ordering by date
CREATE INDEX IF NOT EXISTS idx_yaps_created_at ON public.yaps(created_at DESC);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER yaps_updated_at
  BEFORE UPDATE ON public.yaps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
