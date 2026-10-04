import { Router, Request, Response } from 'express';
import pool from '../db';
import { CreateTripBody, PatchTripBody } from '../schemas';

const router = Router();

// GET /trips
router.get('/trips', async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT id, name, created_at FROM trips ORDER BY created_at DESC'
  );
  res.json(rows);
});

// POST /trips
router.post('/trips', async (req: Request, res: Response) => {
  const parsed = CreateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name } = parsed.data;
  const { rows } = await pool.query(
    'INSERT INTO trips (name) VALUES ($1) RETURNING id, name, created_at',
    [name]
  );
  res.status(201).json(rows[0]);
});

// GET /trips/:id
router.get('/trips/:id', async (req: Request, res: Response) => {
  const { rows: tripRows } = await pool.query(
    'SELECT id, name, created_at FROM trips WHERE id = $1',
    [req.params['id']]
  );
  if (tripRows.length === 0) {
    res.status(404).json({ error: 'trip not found' });
    return;
  }
  const { rows: memberRows } = await pool.query(
    `SELECT m.id, m.name, m.home_airport, m.created_at,
            p.budget, p.weather_weight, p.nightlife_weight, p.preferred_temp_f
     FROM members m
     LEFT JOIN preferences p ON p.member_id = m.id
     WHERE m.trip_id = $1
     ORDER BY m.created_at`,
    [req.params['id']]
  );
  res.json({ ...tripRows[0], members: memberRows });
});

// PATCH /trips/:id
router.patch('/trips/:id', async (req: Request, res: Response) => {
  const parsed = PatchTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { rows } = await pool.query(
    'UPDATE trips SET name = $1 WHERE id = $2 RETURNING id, name, created_at',
    [parsed.data.name, req.params['id']]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'trip not found' });
    return;
  }
  res.json(rows[0]);
});

// DELETE /trips/:id
router.delete('/trips/:id', async (req: Request, res: Response) => {
  const { rowCount } = await pool.query(
    'DELETE FROM trips WHERE id = $1',
    [req.params['id']]
  );
  if (rowCount === 0) {
    res.status(404).json({ error: 'trip not found' });
    return;
  }
  res.status(204).send();
});

export default router;
