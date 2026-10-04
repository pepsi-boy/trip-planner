import fs from 'fs';
import path from 'path';
import type { FlightProvider, FareQuote } from '../interfaces';

interface Segment { }
interface Itinerary {
  price: { amount: number; currency: string };
  outbound: { duration_minutes: number; segments: Segment[] };
}

// Reads bna-sfo.json for any origin/destination pair during dev and tests.
// This avoids burning live API quota (free tier: 1,000 requests).
export class FixtureFlightProvider implements FlightProvider {
  private itineraries: Itinerary[];

  constructor(fixturePath = path.join(process.cwd(), 'fixtures/bna-sfo.json')) {
    const raw = fs.readFileSync(fixturePath, 'utf8');
    this.itineraries = (JSON.parse(raw) as { itineraries: Itinerary[] }).itineraries;
  }

  async getFare(origin: string, destination: string, _departureDate: string): Promise<FareQuote> {
    const prices = this.itineraries.map(i => i.price.amount);
    const nonstopPrices = this.itineraries
      .filter(i => i.outbound.segments.length === 1)
      .map(i => i.price.amount);

    return {
      origin,
      destination,
      cheapest: Math.min(...prices),
      cheapestNonstop: nonstopPrices.length > 0 ? Math.min(...nonstopPrices) : null,
      currency: this.itineraries[0]?.price.currency ?? 'USD',
    };
  }
}
