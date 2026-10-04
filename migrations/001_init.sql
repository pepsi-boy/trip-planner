CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── trips ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── members ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  home_airport CHAR(3) NOT NULL CHECK (home_airport ~ '^[A-Z]{3}$'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS members_trip_id_idx ON members(trip_id);

-- ── preferences ────────────────────────────────────────────────────────────
-- budget = max acceptable one-way fare in USD
CREATE TABLE IF NOT EXISTS preferences (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
  budget           NUMERIC(10,2) NOT NULL CHECK (budget > 0),
  weather_weight   NUMERIC(3,2)  NOT NULL CHECK (weather_weight   BETWEEN 0 AND 1),
  nightlife_weight NUMERIC(3,2)  NOT NULL CHECK (nightlife_weight BETWEEN 0 AND 1),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── destinations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS destinations (
  iata CHAR(3) PRIMARY KEY CHECK (iata ~ '^[A-Z]{3}$'),
  city TEXT NOT NULL,
  lat  NUMERIC(8,4) NOT NULL,
  lon  NUMERIC(8,4) NOT NULL
);

INSERT INTO destinations (iata, city, lat, lon) VALUES
  ('SFO', 'San Francisco', 37.6213, -122.3790),
  ('MIA', 'Miami',         25.7959,  -80.2870),
  ('CDG', 'Paris',         49.0097,    2.5479),
  ('NRT', 'Tokyo',         35.7720,  140.3929),
  ('LHR', 'London',        51.4700,   -0.4543),
  ('CUN', 'Cancun',        21.0365,  -86.8771),
  ('DEN', 'Denver',        39.8561, -104.6737),
  ('ORD', 'Chicago',       41.9742,  -87.9073),
  ('LAS', 'Las Vegas',     36.0840, -115.1537),
  ('BCN', 'Barcelona',     41.2971,    2.0785)
ON CONFLICT (iata) DO NOTHING;
