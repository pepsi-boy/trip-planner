import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool from '../src/db';

afterAll(() => pool.end());

describe('trips CRUD', () => {
  let tripId: string;

  it('POST /trips creates a trip', async () => {
    const res = await request(app).post('/trips').send({ name: 'Euro Trip' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Euro Trip');
    tripId = res.body.id as string;
  });

  it('GET /trips lists trips', async () => {
    const res = await request(app).get('/trips');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /trips/:id returns trip with members', async () => {
    const res = await request(app).get(`/trips/${tripId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tripId);
    expect(Array.isArray(res.body.members)).toBe(true);
  });

  it('PATCH /trips/:id renames a trip', async () => {
    const res = await request(app).patch(`/trips/${tripId}`).send({ name: 'Asia Trip' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Asia Trip');
  });

  it('POST /trips returns 400 for missing name', async () => {
    const res = await request(app).post('/trips').send({});
    expect(res.status).toBe(400);
  });

  describe('members CRUD', () => {
    let memberId: string;

    it('POST /trips/:tripId/members adds a member', async () => {
      const res = await request(app)
        .post(`/trips/${tripId}/members`)
        .send({ name: 'Alice', home_airport: 'BNA' });
      expect(res.status).toBe(201);
      expect(res.body.home_airport).toBe('BNA');
      memberId = res.body.id as string;
    });

    it('rejects invalid IATA code', async () => {
      const res = await request(app)
        .post(`/trips/${tripId}/members`)
        .send({ name: 'Bob', home_airport: 'jfk' });
      expect(res.status).toBe(400);
    });

    it('PATCH member updates home_airport', async () => {
      const res = await request(app)
        .patch(`/trips/${tripId}/members/${memberId}`)
        .send({ home_airport: 'SFO' });
      expect(res.status).toBe(200);
      expect(res.body.home_airport).toBe('SFO');
    });

    describe('preferences', () => {
      it('PUT preferences upserts', async () => {
        const res = await request(app)
          .put(`/trips/${tripId}/members/${memberId}/preferences`)
          .send({ budget: 500, weather_weight: 0.6, nightlife_weight: 0.4 });
        expect(res.status).toBe(200);
        expect(Number(res.body.budget)).toBe(500);
      });

      it('GET preferences returns saved values', async () => {
        const res = await request(app)
          .get(`/trips/${tripId}/members/${memberId}/preferences`);
        expect(res.status).toBe(200);
        expect(Number(res.body.weather_weight)).toBe(0.6);
      });

      it('rejects weight out of range', async () => {
        const res = await request(app)
          .put(`/trips/${tripId}/members/${memberId}/preferences`)
          .send({ budget: 500, weather_weight: 1.5, nightlife_weight: 0.4 });
        expect(res.status).toBe(400);
      });

      it('rejects negative budget', async () => {
        const res = await request(app)
          .put(`/trips/${tripId}/members/${memberId}/preferences`)
          .send({ budget: -100, weather_weight: 0.5, nightlife_weight: 0.5 });
        expect(res.status).toBe(400);
      });
    });

    it('DELETE member removes it', async () => {
      const res = await request(app).delete(`/trips/${tripId}/members/${memberId}`);
      expect(res.status).toBe(204);
    });
  });

  it('DELETE /trips/:id removes trip', async () => {
    const res = await request(app).delete(`/trips/${tripId}`);
    expect(res.status).toBe(204);
  });

  it('GET deleted trip returns 404', async () => {
    const res = await request(app).get(`/trips/${tripId}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /destinations', () => {
  it('returns the seeded destinations', async () => {
    const res = await request(app).get('/destinations');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(10);
    expect(res.body[0]).toMatchObject({ iata: expect.any(String), city: expect.any(String) });
  });
});
