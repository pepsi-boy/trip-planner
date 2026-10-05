import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { flightProvider, weatherProvider } from '../providers';
import { scoreDestinations, type MemberInput, type DestinationData } from '../scoring';

const router = Router({ mergeParams: true });

const ScoreBody = z.object({
  destinations: z.array(z.string().regex(/^[A-Z]{3}$/)).min(1),
  departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = ScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { destinations: iatas, departure_date } = parsed.data;

  // Load trip members + preferences
  const { rows: members } = await pool.query<{
    id: string; name: string; home_airport: string;
    budget: string; weather_weight: string; nightlife_weight: string; preferred_temp_f: string;
  }>(
    `SELECT m.id, m.name, m.home_airport,
            p.budget, p.weather_weight, p.nightlife_weight, p.preferred_temp_f
     FROM members m
     JOIN preferences p ON p.member_id = m.id
     WHERE m.trip_id = $1`,
    [req.params['tripId']]
  );
  if (members.length === 0) {
    res.status(422).json({ error: 'trip has no members with preferences' });
    return;
  }

  // Load destination coordinates and nightlife scores from DB
  const { rows: destRows } = await pool.query<{
    iata: string; city: string; lat: string; lon: string; nightlife_score: string;
  }>(
    `SELECT iata, city, lat, lon, nightlife_score FROM destinations WHERE iata = ANY($1)`,
    [iatas]
  );
  const unknownIatas = iatas.filter(i => !destRows.find(d => d.iata === i));
  if (unknownIatas.length > 0) {
    res.status(422).json({ error: `unknown destinations: ${unknownIatas.join(', ')}` });
    return;
  }

  // Fetch fares and weather in parallel per destination
  const destData: DestinationData[] = await Promise.all(
    destRows.map(async dest => {
      const lat = Number(dest.lat);
      const lon = Number(dest.lon);

      // Fetch fare from each member's home airport; each member is scored on their own fare
      const quotes = await Promise.all(
        members.map(m => flightProvider.getFare(m.home_airport, dest.iata, departure_date))
      );
      const fares: Record<string, number> = {};
      members.forEach((m, i) => { fares[m.id] = quotes[i]!.cheapest; });

      const weather = await weatherProvider.getWeather(dest.iata, lat, lon);

      return {
        iata: dest.iata,
        city: dest.city,
        fares,
        temperatureF: weather.temperatureF,
        nightlifeScore: Number(dest.nightlife_score),
      };
    })
  );

  const memberInputs: MemberInput[] = members.map(m => ({
    id: m.id,
    name: m.name,
    budget: Number(m.budget),
    weatherWeight: Number(m.weather_weight),
    nightlifeWeight: Number(m.nightlife_weight),
    preferredTempF: Number(m.preferred_temp_f),
  }));

  const ranked = scoreDestinations(memberInputs, destData);

  res.json({
    strategy_note:
      'groupWeightedAvg maximises total happiness; groupMaxMin maximises the least-happy person\'s score.',
    ranked_by_weighted_avg: ranked,
    ranked_by_max_min: [...ranked].sort((a, b) => b.groupMaxMin - a.groupMaxMin),
  });
});

export default router;
