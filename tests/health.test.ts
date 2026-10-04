import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool from '../src/db';

describe('GET /health', () => {
  afterAll(() => pool.end());

  it('returns 200 with db reachable', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'reachable' });
  });
});
