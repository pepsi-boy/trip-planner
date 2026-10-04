import { describe, it, expect } from 'vitest';
import { scoreDestinations, type MemberInput, type DestinationData } from '../src/scoring';

const members: MemberInput[] = [
  { id: 'm1', name: 'Alice', budget: 500, weatherWeight: 0.8, nightlifeWeight: 0.2, preferredTempF: 80 },
  { id: 'm2', name: 'Bob',   budget: 300, weatherWeight: 0.2, nightlifeWeight: 0.8, preferredTempF: 65 },
];

const destinations: DestinationData[] = [
  { iata: 'MIA', city: 'Miami',     fare: 200, temperatureF: 82, nightlifeScore: 0.85 },
  { iata: 'DEN', city: 'Denver',    fare: 150, temperatureF: 55, nightlifeScore: 0.55 },
  { iata: 'LAS', city: 'Las Vegas', fare: 180, temperatureF: 75, nightlifeScore: 0.95 },
];

describe('scoreDestinations', () => {
  it('returns a result for every destination', () => {
    const results = scoreDestinations(members, destinations);
    expect(results).toHaveLength(3);
  });

  it('marks affordable correctly', () => {
    const results = scoreDestinations(members, destinations);
    const denver = results.find(r => r.iata === 'DEN')!;
    // Both members can afford $150
    expect(denver.memberScores.every(s => s.affordable)).toBe(true);
  });

  it('marks unaffordable correctly', () => {
    const expensive: DestinationData[] = [
      { iata: 'CDG', city: 'Paris', fare: 900, temperatureF: 60, nightlifeScore: 0.90 },
    ];
    const results = scoreDestinations(members, expensive);
    const paris = results[0]!;
    // Both members have budget < 900
    expect(paris.memberScores.every(s => !s.affordable)).toBe(true);
  });

  it('groupWeightedAvg is between 0 and 1', () => {
    const results = scoreDestinations(members, destinations);
    results.forEach(r => {
      expect(r.groupWeightedAvg).toBeGreaterThanOrEqual(0);
      expect(r.groupWeightedAvg).toBeLessThanOrEqual(1);
    });
  });

  it('groupMaxMin <= groupWeightedAvg', () => {
    const results = scoreDestinations(members, destinations);
    results.forEach(r => {
      expect(r.groupMaxMin).toBeLessThanOrEqual(r.groupWeightedAvg);
    });
  });

  it('sorted by groupWeightedAvg descending', () => {
    const results = scoreDestinations(members, destinations);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.groupWeightedAvg).toBeGreaterThanOrEqual(results[i]!.groupWeightedAvg);
    }
  });
});
