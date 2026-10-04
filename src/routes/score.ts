import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { flightProvider, weatherProvider, nightlifeProvider } from '../providers';
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
    budget: string; weather_weight: string; nightlife_weight: string;
  }>(
    `SELECT m.id, m.name, m.home_airport, p.budget, p.weather_weight, p.nightlife_weight
     FROM members m
     JOIN preferences p ON p.member_id = m.id
     WHERE m.trip_id = $1`,
    [req.params['tripId']]
  );
  if (members.length === 0) {
    res.status(422).json({ error: 'trip has no members with preferences' });
    return;
  }

  // Load destination coordinates
  const { rows: destRows } = await pool.query<{
    iata: string; city: string; lat: string; lon: string;
  }>(
    `SELECT iata, city, lat, lon FROM destinations WHERE iata = ANY($1)`,
    [iatas]
  );
  const unknownIatas = iatas.filter(i => !destRows.find(d => d.iata === i));
  if (unknownIatas.length > 0) {
    res.status(422).json({ error: `unknown destinations: ${unknownIatas.join(', ')}` });
    return;
  }

  // Fetch fares, weather, nightlife in parallel per destination
  const destData: DestinationData[] = await Promise.all(
    destRows.map(async dest => {
      const lat = Number(dest.lat);
      const lon = Number(dest.lon);

      // Fetch fare for each member's home airport, take the cheapest
      const fares = await Promise.all(
        members.map(m => flightProvider.getFare(m.home_airport, dest.iata, departure_date))
      );
      const cheapestFare = Math.min(...fares.map(f => f.cheapest));

      const [weather, nightlife] = await Promise.all([
        weatherProvider.getWeather(dest.iata, lat, lon),
        nightlifeProvider.getNightlife(dest.iata, lat, lon),
      ]);

      return {
        iata: dest.iata,
        city: dest.city,
        fare: cheapestFare,
        temperatureF: weather.temperatureF,
        venueCount: nightlife.venueCount,
      };
    })
  );

  const memberInputs: MemberInput[] = members.map(m => ({
    id: m.id,
    name: m.name,
    budget: Number(m.budget),
    weatherWeight: Number(m.weather_weight),
    nightlifeWeight: Number(m.nightlife_weight),
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
