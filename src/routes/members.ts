import { Router, Request, Response } from 'express';
import pool from '../db';
import { CreateMemberBody, PatchMemberBody } from '../schemas';

const router = Router({ mergeParams: true });

// POST /trips/:tripId/members
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  // verify trip exists
  const { rows: trip } = await pool.query('SELECT id FROM trips WHERE id = $1', [req.params['tripId']]);
  if (trip.length === 0) {
    res.status(404).json({ error: 'trip not found' });
    return;
  }
  const { name, home_airport } = parsed.data;
  const { rows } = await pool.query(
    'INSERT INTO members (trip_id, name, home_airport) VALUES ($1, $2, $3) RETURNING id, trip_id, name, home_airport, created_at',
    [req.params['tripId'], name, home_airport]
  );
  res.status(201).json(rows[0]);
});

// PATCH /trips/:tripId/members/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = PatchMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (parsed.data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(parsed.data.name);
  }
  if (parsed.data.home_airport !== undefined) {
    fields.push(`home_airport = $${idx++}`);
    values.push(parsed.data.home_airport);
  }
  values.push(req.params['id'], req.params['tripId']);
  const { rows } = await pool.query(
    `UPDATE members SET ${fields.join(', ')}
     WHERE id = $${idx++} AND trip_id = $${idx}
     RETURNING id, trip_id, name, home_airport, created_at`,
    values
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'member not found' });
    return;
  }
  res.json(rows[0]);
});

// DELETE /trips/:tripId/members/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { rowCount } = await pool.query(
    'DELETE FROM members WHERE id = $1 AND trip_id = $2',
    [req.params['id'], req.params['tripId']]
  );
  if (rowCount === 0) {
    res.status(404).json({ error: 'member not found' });
    return;
  }
  res.status(204).send();
});

export default router;
