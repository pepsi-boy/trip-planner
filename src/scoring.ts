// Scoring strategies for group trip ranking.
//
// Two strategies are compared:
//   weighted-average: maximises total happiness across the group.
//   max-min: maximises the least-happy person's score (egalitarian).
//
// The tradeoff: weighted-average finds the destination most people love,
// but can leave one person miserable. Max-min protects the outlier but
// may pick a destination nobody is excited about.

export interface MemberInput {
  id: string;
  name: string;
  budget: number;          // max one-way fare in USD
  weatherWeight: number;   // 0–1
  nightlifeWeight: number; // 0–1
}

export interface DestinationData {
  iata: string;
  city: string;
  fare: number;            // cheapest one-way fare in USD
  temperatureF: number;
  venueCount: number;
}

export interface MemberScore {
  memberId: string;
  memberName: string;
  score: number;           // 0–1, higher is better
  affordable: boolean;
}

export interface RankedDestination {
  iata: string;
  city: string;
  fare: number;
  temperatureF: number;
  venueCount: number;
  memberScores: MemberScore[];
  groupWeightedAvg: number;
  groupMaxMin: number;
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function scoreDestinations(
  members: MemberInput[],
  destinations: DestinationData[],
): RankedDestination[] {
  const fares = destinations.map(d => d.fare);
  const temps = destinations.map(d => d.temperatureF);
  const venues = destinations.map(d => d.venueCount);

  const fareMin = Math.min(...fares);
  const fareMax = Math.max(...fares);
  const tempMin = Math.min(...temps);
  const tempMax = Math.max(...temps);
  const venueMin = Math.min(...venues);
  const venueMax = Math.max(...venues);

  const ranked = destinations.map(dest => {
    // Lower fare is better — invert the normalized fare score
    const fareScore = 1 - normalize(dest.fare, fareMin, fareMax);
    const tempScore = normalize(dest.temperatureF, tempMin, tempMax);
    const venueScore = normalize(dest.venueCount, venueMin, venueMax);

    const memberScores: MemberScore[] = members.map(m => {
      const totalWeight = m.weatherWeight + m.nightlifeWeight + 1; // 1 = implicit budget weight
      const score =
        (fareScore * 1 + tempScore * m.weatherWeight + venueScore * m.nightlifeWeight) /
        totalWeight;
      return {
        memberId: m.id,
        memberName: m.name,
        score: Math.round(score * 1000) / 1000,
        affordable: dest.fare <= m.budget,
      };
    });

    const scores = memberScores.map(s => s.score);
    const groupWeightedAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const groupMaxMin = Math.min(...scores);

    return {
      iata: dest.iata,
      city: dest.city,
      fare: dest.fare,
      temperatureF: dest.temperatureF,
      venueCount: dest.venueCount,
      memberScores,
      groupWeightedAvg: Math.round(groupWeightedAvg * 1000) / 1000,
      groupMaxMin: Math.round(groupMaxMin * 1000) / 1000,
    };
  });

  // Return sorted by weighted average (caller can re-sort by max-min if needed)
  return ranked.sort((a, b) => b.groupWeightedAvg - a.groupWeightedAvg);
}
