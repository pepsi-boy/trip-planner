import { Router } from 'express';
import pool from '../db';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'reachable' });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

export default router;
