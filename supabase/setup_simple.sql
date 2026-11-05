-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gmcsosyyxbozesxzxxmy/sql

-- 1. Table: short_links
CREATE TABLE IF NOT EXISTS public.short_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    destination_url TEXT NOT NULL,
    platform TEXT DEFAULT 'custom',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: visitor_events (Stores Lat & Long)
CREATE TABLE IF NOT EXISTS public.visitor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    source TEXT DEFAULT 'ip', -- 'gps' or 'ip'
    visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_short_links_slug ON public.short_links(slug);
CREATE INDEX IF NOT EXISTS idx_visitor_events_slug ON public.visitor_events(slug);
CREATE INDEX IF NOT EXISTS idx_visitor_events_visited_at ON public.visitor_events(visited_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;

-- 5. Policies to allow read & write with public anon key
DROP POLICY IF EXISTS "Allow public read short_links" ON public.short_links;
CREATE POLICY "Allow public read short_links" ON public.short_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert short_links" ON public.short_links;
CREATE POLICY "Allow public insert short_links" ON public.short_links FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete short_links" ON public.short_links;
CREATE POLICY "Allow public delete short_links" ON public.short_links FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public insert visitor_events" ON public.visitor_events;
CREATE POLICY "Allow public insert visitor_events" ON public.visitor_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select visitor_events" ON public.visitor_events;
CREATE POLICY "Allow public select visitor_events" ON public.visitor_events FOR SELECT USING (true);
