import { describe, it, expect } from 'vitest';
import { scoreDestinations, type MemberInput, type DestinationData } from '../src/scoring';

const members: MemberInput[] = [
  { id: 'm1', name: 'Alice', budget: 500, weatherWeight: 0.8, nightlifeWeight: 0.2, preferredTempF: 80 },
  { id: 'm2', name: 'Bob',   budget: 300, weatherWeight: 0.2, nightlifeWeight: 0.8, preferredTempF: 65 },
];

const destinations: DestinationData[] = [
  { iata: 'MIA', city: 'Miami',     fares: { m1: 200, m2: 200 }, temperatureF: 82, nightlifeScore: 0.85 },
  { iata: 'DEN', city: 'Denver',    fares: { m1: 150, m2: 150 }, temperatureF: 55, nightlifeScore: 0.55 },
  { iata: 'LAS', city: 'Las Vegas', fares: { m1: 180, m2: 180 }, temperatureF: 75, nightlifeScore: 0.95 },
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
      { iata: 'CDG', city: 'Paris', fares: { m1: 900, m2: 900 }, temperatureF: 60, nightlifeScore: 0.90 },
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

  it('scores each member on their own fare, not the cheapest in the group', () => {
    const sameBudget: MemberInput[] = [
      { id: 'm1', name: 'Alice', budget: 400, weatherWeight: 0, nightlifeWeight: 0, preferredTempF: 70 },
      { id: 'm2', name: 'Bob',   budget: 400, weatherWeight: 0, nightlifeWeight: 0, preferredTempF: 70 },
    ];
    const dest: DestinationData[] = [
      { iata: 'SFO', city: 'San Francisco', fares: { m1: 100, m2: 500 }, temperatureF: 65, nightlifeScore: 0.7 },
    ];
    const [sfo] = scoreDestinations(sameBudget, dest);
    const alice = sfo!.memberScores.find(s => s.memberId === 'm1')!;
    const bob = sfo!.memberScores.find(s => s.memberId === 'm2')!;

    expect(alice.fare).toBe(100);
    expect(alice.score).toBe(0.75);
    expect(alice.affordable).toBe(true);
    // Bob's $500 fare is over his $400 budget, even though Alice's is cheap
    expect(bob.fare).toBe(500);
    expect(bob.score).toBe(0);
    expect(bob.affordable).toBe(false);
    expect(sfo!.fare).toBe(100);
  });

  it('throws when a member has no fare', () => {
    const dest: DestinationData[] = [
      { iata: 'SFO', city: 'San Francisco', fares: { m1: 100 }, temperatureF: 65, nightlifeScore: 0.7 },
    ];
    expect(() => scoreDestinations(members, dest)).toThrow(/missing fare for member m2/);
  });
});
