-- ================================================================
--  TERRIUM — Schema completo para Supabase
--  Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- ─── EXTENSIONES ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
--  1. TABLA: users (Servicio de usuarios)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  tier          VARCHAR(20) NOT NULL DEFAULT 'FREE'
                  CHECK (tier IN ('FREE','BASIC','PRO','ENTERPRISE')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  2. TABLA: subscriptions (Suscripciones de usuarios)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan            VARCHAR(20) NOT NULL CHECK (plan IN ('FREE','BASIC','PRO','ENTERPRISE')),
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','CANCELLED','EXPIRED','PENDING')),
  price_ars       NUMERIC(10,2),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  payment_ref     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  3. TABLA: listings (Propiedades)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.listings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  price_usd     NUMERIC(12,2) NOT NULL CHECK (price_usd > 0),
  price_ars     NUMERIC(14,2),
  surface_m2    NUMERIC(8,2) NOT NULL CHECK (surface_m2 > 0),
  rooms         INTEGER NOT NULL DEFAULT 0 CHECK (rooms >= 0),
  type          VARCHAR(20) NOT NULL
                  CHECK (type IN ('DEPARTAMENTO','CASA','PH','OFICINA','LOCAL','TERRENO')),
  neighborhood  VARCHAR(100) NOT NULL,
  lat           NUMERIC(9,6),
  lng           NUMERIC(9,6),
  owner_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
                  CHECK (status IN ('ACTIVO','PAUSADO','VENDIDO','ELIMINADO')),
  images        TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  4. TABLA: valuations (Valuaciones de propiedades)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.valuations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id        UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  neighborhood      VARCHAR(100) NOT NULL,
  surface_m2        NUMERIC(8,2),
  rooms             INTEGER DEFAULT 0,
  type              VARCHAR(20),
  estimated_price   NUMERIC(12,2),
  price_per_m2      NUMERIC(8,2),
  confidence        NUMERIC(5,2),   -- porcentaje 0-100
  method            VARCHAR(50) DEFAULT 'ML_MODEL',
  input_data        JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  5. TABLA: market_metrics (Analytics — métricas por barrio/mes)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.market_metrics (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  neighborhood      VARCHAR(100) NOT NULL,
  month             INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year              INTEGER NOT NULL CHECK (year >= 2000),
  avg_price_usd_m2  NUMERIC(10,2),
  avg_price_ars_m2  NUMERIC(14,2),
  total_listings    INTEGER DEFAULT 0,
  sold_listings     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (neighborhood, month, year)
);

-- ================================================================
--  6. TABLA: investment_scores (Scores de inversión por barrio)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.investment_scores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  neighborhood  VARCHAR(100) UNIQUE NOT NULL,
  score         NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  yield_pct     NUMERIC(5,2),    -- rendimiento estimado %
  trend         VARCHAR(10) DEFAULT 'ESTABLE'
                  CHECK (trend IN ('ALZA','BAJA','ESTABLE')),
  recommendation TEXT,
  details       JSONB,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  7. TABLA: notifications (Notificaciones)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,   -- 'EMAIL','PUSH','IN_APP'
  subject     VARCHAR(200),
  body        TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (status IN ('PENDIENTE','ENVIADO','LEIDO','ERROR')),
  event       VARCHAR(100) NOT NULL,  -- 'user.registered','listing.created', etc.
  payload     JSONB,
  sent        BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at     TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  ÍNDICES para mejorar performance
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_listings_neighborhood  ON public.listings(neighborhood);
CREATE INDEX IF NOT EXISTS idx_listings_type          ON public.listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_status        ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_owner         ON public.listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_price         ON public.listings(price_usd);
CREATE INDEX IF NOT EXISTS idx_market_metrics_nb_date ON public.market_metrics(neighborhood, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_valuations_user        ON public.valuations(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user     ON public.subscriptions(user_id);

-- ================================================================
--  ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_metrics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de lectura para listings y analytics
DROP POLICY IF EXISTS "Listings son visibles para todos" ON public.listings;
CREATE POLICY "Listings son visibles para todos"
  ON public.listings FOR SELECT USING (status = 'ACTIVO');

DROP POLICY IF EXISTS "Market metrics son públicas" ON public.market_metrics;
CREATE POLICY "Market metrics son públicas"
  ON public.market_metrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Investment scores son públicos" ON public.investment_scores;
CREATE POLICY "Investment scores son públicos"
  ON public.investment_scores FOR SELECT USING (true);

-- Políticas de escritura solo con service_role (backend)
DROP POLICY IF EXISTS "Solo backend puede insertar listings" ON public.listings;
CREATE POLICY "Solo backend puede insertar listings"
  ON public.listings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Solo backend puede actualizar listings" ON public.listings;
CREATE POLICY "Solo backend puede actualizar listings"
  ON public.listings FOR UPDATE USING (true);

-- ================================================================
--  DATOS INICIALES — Investment Scores (barrios de CABA)
-- ================================================================
INSERT INTO public.investment_scores (neighborhood, score, yield_pct, trend) VALUES
  ('Palermo',       82.5, 4.8, 'ALZA'),
  ('Belgrano',      79.0, 4.2, 'ESTABLE'),
  ('Recoleta',      76.5, 3.9, 'ESTABLE'),
  ('Puerto Madero', 88.0, 3.5, 'ALZA'),
  ('Villa Crespo',  71.0, 5.2, 'ALZA'),
  ('Caballito',     68.5, 5.0, 'ESTABLE'),
  ('San Telmo',     65.0, 5.5, 'ALZA'),
  ('Flores',        58.0, 5.8, 'ESTABLE'),
  ('Villa Devoto',  62.5, 5.3, 'ESTABLE'),
  ('Microcentro',   70.0, 4.6, 'BAJA'),
  ('Almagro',       66.5, 5.1, 'ESTABLE'),
  ('Núñez',         73.5, 4.4, 'ALZA')
ON CONFLICT (neighborhood) DO UPDATE
  SET score = EXCLUDED.score, yield_pct = EXCLUDED.yield_pct, trend = EXCLUDED.trend, updated_at = NOW();

-- ================================================================
--  DATOS INICIALES — Market Metrics (últimos 3 meses)
-- ================================================================
INSERT INTO public.market_metrics (neighborhood, month, year, avg_price_usd_m2, total_listings) VALUES
  ('Palermo',       3, 2026, 3850, 142),
  ('Palermo',       4, 2026, 3920, 138),
  ('Palermo',       5, 2026, 4010, 145),
  ('Belgrano',      3, 2026, 3600, 98),
  ('Belgrano',      4, 2026, 3650, 102),
  ('Belgrano',      5, 2026, 3700, 99),
  ('Recoleta',      3, 2026, 3750, 87),
  ('Recoleta',      4, 2026, 3800, 91),
  ('Recoleta',      5, 2026, 3820, 89),
  ('Puerto Madero', 3, 2026, 5200, 34),
  ('Puerto Madero', 4, 2026, 5350, 38),
  ('Puerto Madero', 5, 2026, 5450, 36),
  ('Villa Crespo',  3, 2026, 2900, 76),
  ('Villa Crespo',  4, 2026, 2980, 80),
  ('Villa Crespo',  5, 2026, 3050, 83),
  ('Caballito',     3, 2026, 2750, 95),
  ('Caballito',     4, 2026, 2800, 98),
  ('Caballito',     5, 2026, 2850, 101),
  ('San Telmo',     3, 2026, 2600, 62),
  ('San Telmo',     4, 2026, 2650, 65),
  ('San Telmo',     5, 2026, 2700, 68),
  ('Almagro',       3, 2026, 2500, 71),
  ('Almagro',       4, 2026, 2550, 74),
  ('Almagro',       5, 2026, 2580, 72),
  ('Núñez',         3, 2026, 3200, 58),
  ('Núñez',         4, 2026, 3250, 61),
  ('Núñez',         5, 2026, 3300, 63)
ON CONFLICT (neighborhood, month, year) DO NOTHING;

