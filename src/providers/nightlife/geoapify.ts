import type { NightlifeProvider, NightlifeQuote } from '../interfaces';
import { TokenBucket } from '../../lib/tokenBucket';
import { Cache } from '../../lib/cache';

const ONE_HOUR = 60 * 60 * 1000;
// Search radius in metres around the city centre
const RADIUS = 5000;

interface GeoapifyFeature { }
interface GeoapifyResponse { features: GeoapifyFeature[] }

export class GeoapifyNightlifeProvider implements NightlifeProvider {
  private bucket = new TokenBucket(5, 1);
  private cache = new Cache<NightlifeQuote>(ONE_HOUR);

  constructor(private readonly apiKey: string) {}

  async getNightlife(destination: string, lat: number, lon: number): Promise<NightlifeQuote> {
    const cached = this.cache.get(destination);
    if (cached) return cached;

    if (!this.bucket.consume()) throw new Error('geoapify rate limit exceeded');

    // categories covering bars, nightclubs, and entertainment venues
    const categories = 'entertainment.nightclub,catering.bar,entertainment.casino';
    const url =
      `https://api.geoapify.com/v2/places` +
      `?categories=${categories}` +
      `&filter=circle:${lon},${lat},${RADIUS}` +
      `&limit=500&apiKey=${this.apiKey}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`geoapify ${res.status}`);

    const data = (await res.json()) as GeoapifyResponse;
    const quote: NightlifeQuote = { destination, venueCount: data.features.length };
    this.cache.set(destination, quote);
    return quote;
  }
}
