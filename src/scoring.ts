// Scoring strategies for group trip ranking.
//
// Two strategies are compared:
//   weighted-average: maximises total happiness across the group.
//   max-min: maximises the least-happy person's score (egalitarian).
//
// Tradeoff: weighted-average can leave one person miserable if the rest love a destination.
// Max-min protects the outlier but may pick somewhere nobody is excited about.

export interface MemberInput {
  id: string;
  name: string;
  budget: number;           // max one-way fare in USD
  weatherWeight: number;    // 0-1
  nightlifeWeight: number;  // 0-1
  preferredTempF: number;   // ideal temperature in Fahrenheit
}

export interface DestinationData {
  iata: string;
  city: string;
  fare: number;             // cheapest one-way fare in USD
  temperatureF: number;     // current forecast temperature
  nightlifeScore: number;   // 0-1, curated static score from DB
}

export interface MemberScore {
  memberId: string;
  memberName: string;
  score: number;            // 0-1, higher is better
  affordable: boolean;
}

export interface RankedDestination {
  iata: string;
  city: string;
  fare: number;
  temperatureF: number;
  nightlifeScore: number;
  memberScores: MemberScore[];
  groupWeightedAvg: number;
  groupMaxMin: number;
}

export function scoreDestinations(
  members: MemberInput[],
  destinations: DestinationData[],
): RankedDestination[] {
  const ranked = destinations.map(dest => {
    const memberScores: MemberScore[] = members.map(m => {
      // Cost: 1.0 at fare=0, falls linearly to 0 at fare=budget, 0 if over budget
      const costScore = Math.max(0, 1 - dest.fare / m.budget);

      // Weather: 1.0 at preferred temp, drops 0.02 per degree off, floors at 0
      // A 50°F difference = score of 0
      const weatherScore = Math.max(0, 1 - Math.abs(dest.temperatureF - m.preferredTempF) / 50);

      // Nightlife: direct from DB (0-1)
      const nightlifeScore = dest.nightlifeScore;

      const totalWeight = 1 + m.weatherWeight + m.nightlifeWeight;
      const score =
        (costScore * 1 +
          weatherScore * m.weatherWeight +
          nightlifeScore * m.nightlifeWeight) /
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
      nightlifeScore: dest.nightlifeScore,
      memberScores,
      groupWeightedAvg: Math.round(groupWeightedAvg * 1000) / 1000,
      groupMaxMin: Math.round(groupMaxMin * 1000) / 1000,
    };
  });

  return ranked.sort((a, b) => b.groupWeightedAvg - a.groupWeightedAvg);
}
