# Group Trip Planner

A REST API that helps a group of friends agree on a travel destination. Each person enters their home airport, budget, preferred temperature, and how much they care about weather and nightlife. The service fetches live flight prices and weather forecasts, then ranks candidate destinations using two scoring strategies.

**Live API:** https://trip-planner-nbgx.onrender.com

---

## Architecture

```
Client
  |
  | HTTP
  v
Express API (Node + TypeScript)
  |
  |-- CRUD: trips, members, preferences
  |
  |-- POST /trips/:id/score
        |
        |-- FlightProvider --> Ignav API (fixture in dev/test)
        |-- WeatherProvider --> Open-Meteo API (15-min cache)
        |-- nightlife_score from destinations table (curated)
        |
        v
     Scoring Engine
        |-- per-member score (cost + weather + nightlife)
        |-- group weighted average
        |-- group max-min
        v
     Ranked destinations JSON
  |
  v
Postgres (docker-compose locally, Render managed in production)
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Runtime | Node.js 22 |
| Framework | Express 5 |
| Database | PostgreSQL 16 (via docker-compose / Render) |
| Validation | Zod |
| Testing | Vitest + Supertest |
| CI | GitHub Actions |
| Deployment | Docker on Render |

---

## API Endpoints

### Health
```
GET /health
```

### Trips
```
GET    /trips
POST   /trips                    { name }
GET    /trips/:id
PATCH  /trips/:id                { name }
DELETE /trips/:id
```

### Members
```
POST   /trips/:tripId/members              { name, home_airport }
PATCH  /trips/:tripId/members/:id          { name?, home_airport? }
DELETE /trips/:tripId/members/:id
```

### Preferences
```
PUT    /trips/:tripId/members/:id/preferences
       { budget, weather_weight, nightlife_weight, preferred_temp_f }
GET    /trips/:tripId/members/:id/preferences
```

### Destinations
```
GET /destinations
```

### Scoring
```
POST /trips/:tripId/score
     { destinations: ["SFO","MIA","CDG"], departure_date: "2026-11-03" }
```

Returns both group strategies with per-member breakdowns.

---

## Scoring

For each member + destination pair:

```
cost_score      = max(0, 1 - fare / budget)
weather_score   = max(0, 1 - |forecast_temp - preferred_temp| / 50)
nightlife_score = destination.nightlife_score  (0-1)

member_score = (
  cost_score * 1 +
  weather_score * weather_weight +
  nightlife_score * nightlife_weight
) / (1 + weather_weight + nightlife_weight)
```

Two group strategies are returned:

**Weighted average** -- the mean of all member scores. Picks the destination most people are happy with overall, but can leave one person with a very low score if everyone else loves a place.

**Max-min** -- the minimum member score across the group. Picks the destination that maximises the least-happy person's score. Protects outliers but may select a destination that nobody is particularly excited about.

Both are returned in the response so the group can decide which tradeoff they prefer.

---

## Data Sources

| Data | Source | Notes |
|---|---|---|
| Flight prices | Ignav API | Fixture-backed in dev/test to protect 1,000-request free tier |
| Weather | Open-Meteo | Free, no key, cached 15 min per city |
| Nightlife | Curated static scores | Hand-estimated 0-1 scores per destination stored in DB |

Nightlife scores are estimates, not live data. The provider interface is designed so a live source (Foursquare, Geoapify, Overpass) can be swapped in without changing the scoring logic.

---

## Local Development

**Requirements:** Node 22, Docker Desktop

```bash
# 1. Clone and install
git clone https://github.com/pepsi-boy/trip-planner.git
cd trip-planner
npm install

# 2. Set env vars
cp .env.example .env
# Fill in IGNAV_API_KEY and GEOAPIFY_API_KEY

# 3. Start Postgres
docker compose up -d

# 4. Run migrations
npm run migrate

# 5. Start the server
npm run dev
```

The server starts at `http://localhost:3000`.

---

## Running Tests

Tests use a fixture flight provider and a real local Postgres instance -- no live API calls.

```bash
npm test
```

GitHub Actions runs the same suite on every push using a fresh Postgres container.

---

## Deployment

The app ships as a Docker image. On every push to `main`, Render pulls the repo, builds the image from `Dockerfile`, runs migrations, and starts the server.

To deploy your own instance:

1. Create a Postgres database on Render (or Neon, Supabase, etc.)
2. Create a Render web service from this repo using Docker
3. Set env vars: `DATABASE_URL`, `DATABASE_SSL=true`, `IGNAV_API_KEY`, `GEOAPIFY_API_KEY`
4. Set health check path to `/health`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `DATABASE_SSL` | Production | Set to `true` for managed Postgres |
| `IGNAV_API_KEY` | Yes | Ignav flight API key |
| `GEOAPIFY_API_KEY` | No | Geoapify places API key (unused currently) |
| `USE_LIVE_FLIGHTS` | No | Set to `true` to call Ignav live (default: fixture) |
| `PORT` | No | Server port (default: 3000) |
