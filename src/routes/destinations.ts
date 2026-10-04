import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/destinations', async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT iata, city, lat, lon FROM destinations ORDER BY city'
  );
  res.json(rows);
});

export default router;
