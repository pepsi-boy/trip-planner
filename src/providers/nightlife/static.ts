import type { NightlifeProvider, NightlifeQuote } from '../interfaces';

// Fallback when no live nightlife API is available.
// Scores are estimated venue counts based on publicly known city data.
const STATIC_SCORES: Record<string, number> = {
  SFO: 320, MIA: 410, CDG: 480, NRT: 390, LHR: 440,
  CUN: 280, DEN: 210, ORD: 350, LAS: 500, BCN: 460,
};

export class StaticNightlifeProvider implements NightlifeProvider {
  async getNightlife(destination: string, _lat: number, _lon: number): Promise<NightlifeQuote> {
    return { destination, venueCount: STATIC_SCORES[destination] ?? 100 };
  }
}
