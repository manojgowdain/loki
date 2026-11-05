-- supabase/migrations/001_init.sql

-- Table: short_links
CREATE TABLE public.short_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    destination_url text NOT NULL,
    platform text,
    description text,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table: visitor_events
CREATE TABLE public.visitor_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id uuid REFERENCES public.short_links(id) ON DELETE CASCADE,
    slug text NOT NULL,
    visitor_session_id text,
    ip_address text,
    country text,
    country_code text,
    state text,
    city text,
    postal_code text,
    latitude double precision,
    longitude double precision,
    timezone text,
    isp text,
    asn text,
    gps_latitude double precision,
    gps_longitude double precision,
    gps_accuracy double precision,
    gps_consent boolean DEFAULT false,
    location_permission text,
    device_type text,
    browser text,
    operating_system text,
    user_agent text,
    referrer text,
    visited_at timestamptz DEFAULT now()
);

-- Table: campaign_conversions
CREATE TABLE public.campaign_conversions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id uuid REFERENCES public.short_links(id) ON DELETE CASCADE,
    campaign_id text,
    external_order_id text,
    platform text,
    conversion_status text,
    order_value numeric,
    currency text,
    conversion_city text,
    conversion_state text,
    conversion_country text,
    converted_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Table: admin_profiles
CREATE TABLE public.admin_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    role text,
    created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_short_links_slug ON public.short_links(slug);
CREATE INDEX idx_visitor_events_link_id ON public.visitor_events(link_id);
CREATE INDEX idx_visitor_events_slug ON public.visitor_events(slug);
CREATE INDEX idx_visitor_events_visited_at ON public.visitor_events(visited_at);
CREATE INDEX idx_visitor_events_country ON public.visitor_events(country);
CREATE INDEX idx_visitor_events_city ON public.visitor_events(city);
CREATE INDEX idx_campaign_conversions_link_id ON public.campaign_conversions(link_id);
CREATE INDEX idx_campaign_conversions_converted_at ON public.campaign_conversions(converted_at);
