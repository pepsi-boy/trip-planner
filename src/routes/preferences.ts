import { Router, Request, Response } from 'express';
import pool from '../db';
import { UpsertPreferencesBody } from '../schemas';

const router = Router({ mergeParams: true });

// GET /trips/:tripId/members/:id/preferences
router.get('/', async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.member_id, p.budget, p.weather_weight, p.nightlife_weight,
            p.preferred_temp_f, p.updated_at
     FROM preferences p
     JOIN members m ON m.id = p.member_id
     WHERE p.member_id = $1 AND m.trip_id = $2`,
    [req.params['memberId'], req.params['tripId']]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'preferences not found' });
    return;
  }
  res.json(rows[0]);
});

// PUT /trips/:tripId/members/:id/preferences
router.put('/', async (req: Request, res: Response) => {
  const parsed = UpsertPreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { rows: member } = await pool.query(
    'SELECT id FROM members WHERE id = $1 AND trip_id = $2',
    [req.params['memberId'], req.params['tripId']]
  );
  if (member.length === 0) {
    res.status(404).json({ error: 'member not found' });
    return;
  }
  const { budget, weather_weight, nightlife_weight, preferred_temp_f } = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO preferences (member_id, budget, weather_weight, nightlife_weight, preferred_temp_f)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (member_id) DO UPDATE
       SET budget = EXCLUDED.budget,
           weather_weight = EXCLUDED.weather_weight,
           nightlife_weight = EXCLUDED.nightlife_weight,
           preferred_temp_f = EXCLUDED.preferred_temp_f,
           updated_at = now()
     RETURNING id, member_id, budget, weather_weight, nightlife_weight, preferred_temp_f, updated_at`,
    [req.params['memberId'], budget, weather_weight, nightlife_weight, preferred_temp_f]
  );
  res.status(200).json(rows[0]);
});

export default router;
