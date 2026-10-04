import { describe, it, expect } from 'vitest';
import { FixtureFlightProvider } from '../src/providers/flight/fixture';

describe('FixtureFlightProvider', () => {
  const provider = new FixtureFlightProvider();

  it('returns a FareQuote', async () => {
    const quote = await provider.getFare('BNA', 'SFO', '2026-11-03');
    expect(quote.origin).toBe('BNA');
    expect(quote.destination).toBe('SFO');
    expect(quote.cheapest).toBeGreaterThan(0);
    expect(quote.currency).toBeTruthy();
  });

  it('cheapestNonstop is a number or null', async () => {
    const quote = await provider.getFare('BNA', 'SFO', '2026-11-03');
    expect(quote.cheapestNonstop === null || typeof quote.cheapestNonstop === 'number').toBe(true);
  });

  it('cheapestNonstop >= cheapest when present', async () => {
    const quote = await provider.getFare('BNA', 'SFO', '2026-11-03');
    if (quote.cheapestNonstop !== null) {
      expect(quote.cheapestNonstop).toBeGreaterThanOrEqual(quote.cheapest);
    }
  });
});
