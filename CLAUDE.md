# Group Trip Planner — Project Brief

## Project

A backend service + minimal React page. Friends each enter a home airport, budget, preferred temperature, and weights for weather and nightlife. The service fetches weather and flight prices for candidate destinations, scores each destination per person, and ranks destinations for the whole group.

**Purpose:** Portfolio project for SWE internship applications (Amazon, Microsoft, Google, NVIDIA, Cloudflare, etc.). Must look like real engineering: CRUD API, Postgres, tests, CI, Docker, deployed, strong README. Target: deployed in one evening (~5 hours).

---

## Stack

- TypeScript, Node, Express
- Postgres via docker-compose
- Zod for validation
- dotenv
- React (minimal page, added later)
- GitHub Actions for tests
- Deployed via Dockerfile to Render

---

## Data Sources

### 1. Weather — Open-Meteo (free, no key)
```
GET https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m&temperature_unit=fahrenheit&timezone=auto
```
- Cache each city for 15 minutes (data updates every 15 min).

### 2. Flights — Ignav (one-way fares only)
```
POST https://ignav.com/api/fares/one-way
Header: X-Api-Key (from IGNAV_API_KEY in .env)
Body: { origin, destination, departure_date }
```
- Response: `itineraries[]`, each with `price.amount`, `price.currency`, `outbound.duration_minutes`, `outbound.segments`.
- More than one segment = connection.
- **NEVER call live API during dev or tests.** Free tier = 1,000 requests.
- Use `fixtures/bna-sfo.json` for all dev/test work.
- Default to fixture provider. Enable live calls only via `USE_LIVE_FLIGHTS=true` env var.
- budget = max acceptable one-way fare in USD.

### 3. Nightlife — curated static scores
- `nightlife_score` (0.0-1.0) is stored directly on each destination row in the DB.
- Scores are hand-curated estimates. README states this clearly.
- No live API needed. If a live source is added later, it slots in via the NightlifeProvider interface.

---

## Scoring Formula

For each member + destination pair:

```
weather_score  = max(0, 1 - |forecast_temp - preferred_temp_f| / 50)
cost_score     = max(0, 1 - fare / budget)   → 0 if fare > budget
nightlife_score = destination.nightlife_score  (0-1, from DB)

member_score = (
  cost_score * 1 +
  weather_score * weather_weight +
  nightlife_score * nightlife_weight
) / (1 + weather_weight + nightlife_weight)
```

Group strategies (both returned in /score response):
- **weighted-average**: mean of all member scores. Maximises total happiness.
- **max-min**: minimum member score. Maximises the least-happy person's score (egalitarian).

Tradeoff: weighted-average can leave one person miserable if everyone else loves a destination. Max-min protects the outlier but may pick somewhere nobody is excited about. Explain this in the README.

---

## Design Decisions

### Provider interfaces
Every external provider sits behind an interface (`FlightProvider`, `WeatherProvider`, `NightlifeProvider`) so it can be swapped. Fixture-backed `FlightProvider` is the default.

### Fare schema
```ts
type FareQuote = {
  origin: string;
  destination: string;
  cheapest: number;
  cheapestNonstop: number | null;
  currency: string;
};
```
Scoring only sees `FareQuote`.

### Flight provider env flag
- `USE_LIVE_FLIGHTS=true` → use live Ignav API
- Default (unset or false) → use fixture provider (`fixtures/bna-sfo.json`)
- Cache each (origin, destination, date) lookup in memory for the day.

### Rate limiting & caching
- Token bucket per provider, in-memory (no Redis).
- Weather cache: 15-minute TTL.
- Also rate-limit the public API.

### CRUD resources
- trips
- members
- preferences (includes preferred_temp_f)
- destinations (includes nightlife_score)

---

## Schema

```sql
preferences
  preferred_temp_f  NUMERIC(5,1)  CHECK (preferred_temp_f BETWEEN 20 AND 110)

destinations
  nightlife_score   NUMERIC(3,2)  CHECK (nightlife_score BETWEEN 0 AND 1)
```

---

## Scope Cuts

- No Redis
- No WebSockets
- No auth
- Minimal UI

---

## Rules

- Never read, print, or commit `.env`. Keep secrets out of code and logs.
- Commit in small steps with clear messages. No Claude co-author trailer.
- Write tests as you go using fixtures, not live APIs.
- Keep code simple; briefly explain non-obvious choices so the author can discuss them in interviews.
- No em dashes in README or docs.
