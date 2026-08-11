-- ====================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR MINECRAFT LEADERBOARDS
-- Execute this script in the Supabase SQL Editor (Dashboard -> SQL Editor)
-- ====================================================================

-- 1. Create the minecraft_leaderboards table if it does not exist
CREATE TABLE IF NOT EXISTS public.minecraft_leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_type TEXT NOT NULL,
    player_uuid TEXT NOT NULL,
    player_name TEXT NOT NULL,
    score NUMERIC DEFAULT 0,
    rank INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT minecraft_leaderboards_type_uuid_key UNIQUE (leaderboard_type, player_uuid)
);

-- 2. Create performance indexes for quick queries and sorting
CREATE INDEX IF NOT EXISTS idx_minecraft_leaderboards_type_rank 
ON public.minecraft_leaderboards(leaderboard_type, rank);

CREATE INDEX IF NOT EXISTS idx_minecraft_leaderboards_type_score 
ON public.minecraft_leaderboards(leaderboard_type, score DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.minecraft_leaderboards ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read access" ON public.minecraft_leaderboards;
DROP POLICY IF EXISTS "Allow service role write access" ON public.minecraft_leaderboards;

-- 5. Create policy allowing public SELECT queries (website reading)
CREATE POLICY "Allow public read access"
ON public.minecraft_leaderboards
FOR SELECT
TO anon, authenticated
USING (true);

-- 6. Create policy allowing service_role (Edge Function & Sync Service) full insert/update/upsert access
CREATE POLICY "Allow service role write access"
ON public.minecraft_leaderboards
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
