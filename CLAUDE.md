# Group Trip Planner — Project Brief

## Project

A backend service + minimal React page. Friends each enter a home airport, budget, and weights for weather and nightlife. The service fetches weather, flight prices, and nightlife data for candidate destinations, scores each destination per person, and ranks destinations for the whole group.

**Purpose:** Portfolio project for SWE internship applications (Amazon, Microsoft, Google, NVIDIA, Cloudflare, etc.). Must look like real engineering: CRUD API, Postgres, tests, CI, Docker, deployed, strong README. Target: deployed in one evening (~5 hours).

---

## Stack

- TypeScript, Node, Express
- Postgres via docker-compose
- Zod for validation
- dotenv
- React (minimal page, added later)
- GitHub Actions for tests
- Deploy via Dockerfile to Render, Railway, or Fly.io

---

## Data Sources

### 1. Weather — Open-Meteo (free, no key)
```
GET https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m&temperature_unit=fahrenheit&timezone=auto
```
- Cache each city for 15 minutes (data updates every 15 min).

### 2. Flights — Ignav
```
POST https://ignav.com/api/fares/one-way
Header: X-Api-Key (from IGNAV_API_KEY in .env)
Body: { origin, destination, departure_date }
```
- Response: `itineraries[]`, each with `price.amount`, `price.currency`, `outbound.duration_minutes`, `outbound.segments`.
- More than one segment = connection.
- **NEVER call live API during dev or tests.** Free tier = 1,000 requests.
- Use `fixtures/bna-sfo.json` for all dev/test work.
- Only call live if the user explicitly asks.

### 3. Nightlife — TBD
- Candidates: Foursquare, Geoapify, OpenStreetMap Overpass.
- **Ask before picking one.** If none works, use a static dataset and note it in README.

---

## Design Decisions

### Provider interfaces
Every external provider sits behind an interface (`FlightProvider`, `WeatherProvider`, `PlacesProvider`) so it can be swapped. Include a fixture-backed or estimate-backed `FlightProvider` for tests and fallback.

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

### Rate limiting & caching
- Token bucket per provider, in-memory (no Redis tonight).
- Caching + retry with backoff per provider.
- Also rate-limit the public API.

### Scoring
- Normalize each factor, apply each person's weights.
- Compare two group strategies:
  1. Weighted average across all members.
  2. Maximize the least-happy person's score (egalitarian).
- Explain the tradeoff in the README.

### CRUD resources
- trips
- members
- preferences

---

## Scope Cuts (tonight)

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

---

## Current State

- `~/trip-planner/` exists.
- `fixtures/bna-sfo.json` is saved (check before assuming).
- git init and npm install may or may not have been run — verify before proceeding.
- Docker Desktop is available.

---

## Next Step (on go-ahead)

1. Verify environment: git, npm deps, docker-compose.yml, .gitignore includes .env.
2. Propose Postgres schema and endpoint list for approval.
3. Wait for approval before implementing.
