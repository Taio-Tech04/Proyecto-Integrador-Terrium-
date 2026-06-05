-- ================================================================
--  TERRIUM — Script de corrección para Supabase
--  Ejecutar en: https://supabase.com → SQL Editor → New Query
--  Proyecto: tvinjfhjsqoiptduozaa
--  Fecha: 2026-06-05
-- ================================================================

-- ────────────────────────────────────────────────────────────────
--  PASO 1: Corregir investment_scores
--          Problema: tiene CHECK constraint con UP/DOWN/STABLE (inglés)
--          Solución: eliminar constraint, actualizar datos, recrear con español
-- ────────────────────────────────────────────────────────────────

-- 1a. Eliminar el check constraint viejo (inglés)
ALTER TABLE public.investment_scores
  DROP CONSTRAINT IF EXISTS investment_scores_trend_check;

-- 1b. Actualizar valores de inglés a español
UPDATE public.investment_scores SET trend = 'ALZA'    WHERE trend = 'UP';
UPDATE public.investment_scores SET trend = 'BAJA'    WHERE trend = 'DOWN';
UPDATE public.investment_scores SET trend = 'ESTABLE' WHERE trend IN ('STABLE', 'NEUTRAL');

-- 1c. Agregar columna recommendation si no existe
ALTER TABLE public.investment_scores
  ADD COLUMN IF NOT EXISTS recommendation TEXT;

-- 1d. Recrear el check constraint con valores en español
ALTER TABLE public.investment_scores
  ADD CONSTRAINT investment_scores_trend_check
  CHECK (trend IN ('ALZA', 'BAJA', 'ESTABLE'));

-- 1e. Actualizar recomendaciones
UPDATE public.investment_scores SET recommendation =
  CASE
    WHEN score >= 80 AND trend = 'ALZA' THEN 'Excelente oportunidad de inversión. Alta demanda y potencial de valorización.'
    WHEN score >= 70                    THEN 'Buena zona para invertir. Mercado activo con perspectivas positivas.'
    WHEN score >= 60                    THEN 'Zona en desarrollo. Considerar para inversión a mediano plazo.'
    ELSE 'Mercado maduro. Mayor seguridad pero menor potencial de valorización.'
  END;

-- ────────────────────────────────────────────────────────────────
--  PASO 2: Crear tablas faltantes
-- ────────────────────────────────────────────────────────────────

-- 2a. USUARIOS
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

-- 2b. SUSCRIPCIONES
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

-- 2c. LISTINGS (propiedades)
CREATE TABLE IF NOT EXISTS public.listings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(200),
  description   TEXT,
  price_usd     NUMERIC(12,2),
  price_ars     NUMERIC(14,2),
  surface_m2    NUMERIC(8,2) NOT NULL CHECK (surface_m2 > 0),
  rooms         INTEGER NOT NULL DEFAULT 0 CHECK (rooms >= 0),
  type          VARCHAR(50) NOT NULL DEFAULT 'VENTA',
  neighborhood  VARCHAR(100) NOT NULL,
  address       VARCHAR(200),
  lat           NUMERIC(9,6),
  lng           NUMERIC(9,6),
  owner_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
                  CHECK (status IN ('ACTIVO','PAUSADO','VENDIDO','ELIMINADO')),
  images        TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2d. VALUACIONES
CREATE TABLE IF NOT EXISTS public.valuations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id        UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  neighborhood      VARCHAR(100) NOT NULL,
  surface_m2        NUMERIC(8,2),
  rooms             INTEGER DEFAULT 0,
  type              VARCHAR(50),
  estimated_price   NUMERIC(12,2),
  price_per_m2      NUMERIC(8,2),
  confidence        NUMERIC(5,4),
  method            VARCHAR(50) DEFAULT 'ML_MODEL',
  input_data        JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2e. NOTIFICACIONES
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  subject     VARCHAR(200),
  body        TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                CHECK (status IN ('PENDIENTE','ENVIADO','LEIDO','ERROR')),
  event       VARCHAR(100) NOT NULL,
  payload     JSONB,
  sent        BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at     TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
--  PASO 3: Índices para performance
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_neighborhood  ON public.listings(neighborhood);
CREATE INDEX IF NOT EXISTS idx_listings_type          ON public.listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_status        ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_owner         ON public.listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_price         ON public.listings(price_usd);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_valuations_user        ON public.valuations(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user     ON public.subscriptions(user_id);

-- ────────────────────────────────────────────────────────────────
--  PASO 4: Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;

-- Listings visibles para todos (solo activos)
DROP POLICY IF EXISTS "Listings visibles para todos" ON public.listings;
CREATE POLICY "Listings visibles para todos"
  ON public.listings FOR SELECT USING (status = 'ACTIVO');

-- Solo el backend (service_role) puede insertar/actualizar listings
DROP POLICY IF EXISTS "Backend puede insertar listings" ON public.listings;
CREATE POLICY "Backend puede insertar listings"
  ON public.listings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Backend puede actualizar listings" ON public.listings;
CREATE POLICY "Backend puede actualizar listings"
  ON public.listings FOR UPDATE USING (true);

-- Usuarios pueden ver solo su propio perfil
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON public.users;
CREATE POLICY "Usuarios ven su propio perfil"
  ON public.users FOR SELECT USING (auth.uid()::text = id::text);

-- ────────────────────────────────────────────────────────────────
--  PASO 5: Limpiar tablas antiguas (nombres en español)
--  OPCIONAL — descomentar solo si querés eliminarlas
-- ────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.suscripcion  CASCADE;
-- DROP TABLE IF EXISTS public.publicacion  CASCADE;
-- (Dejamos usuario y propiedad porque podrían tener datos útiles)

-- ────────────────────────────────────────────────────────────────
--  PASO 6: Datos semilla para listings (si está vacío)
-- ────────────────────────────────────────────────────────────────
INSERT INTO public.listings (title, description, price_usd, surface_m2, rooms, type, neighborhood, address, lat, lng)
SELECT * FROM (VALUES
  ('Moderno departamento en Palermo Soho', 'Luminoso 2 ambientes a metros del parque.', 185000, 55, 2, 'VENTA', 'Palermo', 'Thames 1800', -34.5889, -58.4277),
  ('PH con terraza en Belgrano', 'Amplio PH con terraza privada y vista panorámica.', 320000, 120, 3, 'VENTA', 'Belgrano', 'Av. Cabildo 2400', -34.5601, -58.4568),
  ('Loft en Puerto Madero', 'Loft de diseño frente al río. Piso 8.', 450000, 80, 1, 'VENTA', 'Puerto Madero', 'Av. Alicia Moreau de Justo 500', -34.6118, -58.3622),
  ('Casa en Villa Devoto', 'Casa familiar con jardín y parrilla.', 270000, 180, 4, 'VENTA', 'Villa Devoto', 'Francisco Beiró 5200', -34.6148, -58.5234),
  ('Departamento en Recoleta', '3 ambientes clásico con balcón.', 290000, 95, 3, 'VENTA', 'Recoleta', 'Av. Santa Fe 2200', -34.5875, -58.3944),
  ('Departamento en Caballito', '3 ambientes con cochera.', 165000, 85, 3, 'ALQUILER', 'Caballito', 'Av. Rivadavia 5100', -34.6189, -58.4402),
  ('PH en San Telmo', 'PH con patio interno en barrio histórico.', 175000, 70, 2, 'ALQUILER', 'San Telmo', 'Defensa 800', -34.6212, -58.3731),
  ('Local comercial en Flores', 'Local a la calle en avenida comercial.', 85000, 80, 0, 'COMERCIAL', 'Flores', 'Av. Rivadavia 7200', -34.6312, -58.4648)
) AS v(title, description, price_usd, surface_m2, rooms, type, neighborhood, address, lat, lng)
WHERE NOT EXISTS (SELECT 1 FROM public.listings LIMIT 1);

-- ────────────────────────────────────────────────────────────────
--  VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────────
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') AS columnas
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

