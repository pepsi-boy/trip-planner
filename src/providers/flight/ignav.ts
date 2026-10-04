import type { FlightProvider, FareQuote } from '../interfaces';
import { TokenBucket } from '../../lib/tokenBucket';

interface Segment { }
interface Itinerary {
  price: { amount: number; currency: string };
  outbound: { duration_minutes: number; segments: Segment[] };
}

// Live Ignav provider. Only used when explicitly called — never in tests.
export class IgnavFlightProvider implements FlightProvider {
  private bucket = new TokenBucket(5, 1); // 5 burst, 1 req/sec

  constructor(private readonly apiKey: string) {}

  async getFare(origin: string, destination: string, departureDate: string): Promise<FareQuote> {
    if (!this.bucket.consume()) {
      throw new Error('ignav rate limit exceeded');
    }

    const res = await fetch('https://ignav.com/api/fares/one-way', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey },
      body: JSON.stringify({ origin, destination, departure_date: departureDate }),
    });

    if (!res.ok) throw new Error(`ignav ${res.status}`);

    const data = (await res.json()) as { itineraries: Itinerary[] };
    const prices = data.itineraries.map(i => i.price.amount);
    const nonstopPrices = data.itineraries
      .filter(i => i.outbound.segments.length === 1)
      .map(i => i.price.amount);

    return {
      origin,
      destination,
      cheapest: Math.min(...prices),
      cheapestNonstop: nonstopPrices.length > 0 ? Math.min(...nonstopPrices) : null,
      currency: data.itineraries[0]?.price.currency ?? 'USD',
    };
  }
}
