// Benchmarks the weather provider against the live Open-Meteo API for the
// 10 seeded destinations. Compares three ways of fetching a full set:
//   sequential: one request at a time, no cache
//   parallel:   all requests at once via Promise.all, no cache
//   cached:     same as parallel, but the 15-min cache is already warm
// Each trial uses fresh provider instances so caches and rate limiters start empty.
// Open-Meteo returns 429 on repeated bursts, so the script pauses between phases and
// trials, and redoes a trial that hits a 429. Pauses and retries are never timed.
//
// Usage: npm run bench   (needs internet access, no database or API key)

import { OpenMeteoWeatherProvider } from '../src/providers/weather/openmeteo';

const DESTINATIONS = [
  { iata: 'SFO', lat: 37.6213, lon: -122.379 },
  { iata: 'MIA', lat: 25.7959, lon: -80.287 },
  { iata: 'CDG', lat: 49.0097, lon: 2.5479 },
  { iata: 'NRT', lat: 35.772, lon: 140.3929 },
  { iata: 'LHR', lat: 51.47, lon: -0.4543 },
  { iata: 'CUN', lat: 21.0365, lon: -86.8771 },
  { iata: 'DEN', lat: 39.8561, lon: -104.6737 },
  { iata: 'ORD', lat: 41.9742, lon: -87.9073 },
  { iata: 'LAS', lat: 36.084, lon: -115.1537 },
  { iata: 'BCN', lat: 41.2971, lon: 2.0785 },
];
const TRIALS = 5;
const PHASE_PAUSE_MS = Number(process.env['BENCH_PHASE_PAUSE_MS'] ?? 3_000);
const TRIAL_PAUSE_MS = Number(process.env['BENCH_TRIAL_PAUSE_MS'] ?? 10_000);
const RETRY_PAUSE_MS = Number(process.env['BENCH_RETRY_PAUSE_MS'] ?? 30_000);
const MAX_ATTEMPTS = 3;

// Count real outbound requests by wrapping fetch
let apiCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args: Parameters<typeof fetch>) => {
  apiCalls++;
  return realFetch(...args);
};

async function timed(fn: () => Promise<unknown>): Promise<{ ms: number; calls: number }> {
  const before = apiCalls;
  const start = performance.now();
  await fn();
  return { ms: performance.now() - start, calls: apiCalls - before };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

async function runTrial() {
  const seqProvider = new OpenMeteoWeatherProvider();
  const seq = await timed(async () => {
    for (const d of DESTINATIONS) await seqProvider.getWeather(d.iata, d.lat, d.lon);
  });

  await pause(PHASE_PAUSE_MS);

  const parProvider = new OpenMeteoWeatherProvider();
  const fetchAll = () =>
    Promise.all(DESTINATIONS.map(d => parProvider.getWeather(d.iata, d.lat, d.lon)));
  const par = await timed(fetchAll);
  const cached = await timed(fetchAll);

  return { seq, par, cached };
}

async function main() {
  const results = { sequential: [] as number[], parallel: [] as number[], cached: [] as number[] };
  let callsCold = 0;
  let callsCached = 0;

  for (let t = 1; t <= TRIALS; t++) {
    let trial: Awaited<ReturnType<typeof runTrial>> | undefined;
    for (let attempt = 1; !trial; attempt++) {
      try {
        trial = await runTrial();
      } catch (err) {
        const rateLimited = err instanceof Error && err.message.includes('429');
        if (!rateLimited || attempt === MAX_ATTEMPTS) throw err;
        console.log(`trial ${t}: rate limited (429), waiting ${RETRY_PAUSE_MS / 1000}s and redoing it`);
        await pause(RETRY_PAUSE_MS);
      }
    }
    const { seq, par, cached } = trial;

    results.sequential.push(seq.ms);
    results.parallel.push(par.ms);
    results.cached.push(cached.ms);
    callsCold += par.calls;
    callsCached += cached.calls;

    console.log(
      `trial ${t}: sequential ${seq.ms.toFixed(0)}ms | parallel ${par.ms.toFixed(0)}ms | ` +
        `cached ${cached.ms.toFixed(2)}ms (${cached.calls} API calls)`,
    );
    if (t < TRIALS) await pause(TRIAL_PAUSE_MS);
  }

  const seq = median(results.sequential);
  const par = median(results.parallel);
  const cached = median(results.cached);
  const pct = (from: number, to: number) => ((1 - to / from) * 100).toFixed(1);

  console.log(`\nMedians over ${TRIALS} trials, ${DESTINATIONS.length} destinations:`);
  console.log(`  sequential: ${seq.toFixed(0)}ms`);
  console.log(`  parallel:   ${par.toFixed(0)}ms  (${pct(seq, par)}% faster than sequential, ${(seq / par).toFixed(1)}x)`);
  console.log(`  cached:     ${cached.toFixed(2)}ms  (${(par / cached).toFixed(0)}x faster than an uncached parallel fetch)`);
  console.log(
    `  API calls per scoring run: ${callsCold / TRIALS} uncached -> ${callsCached / TRIALS} cached ` +
      `(${pct(callsCold, callsCached)}% fewer)`,
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
