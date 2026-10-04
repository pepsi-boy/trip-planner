import 'dotenv/config';
import { Pool } from 'pg';

// DATABASE_SSL=true enables SSL for managed Postgres hosts (Render, Railway, Fly).
// Off by default so local docker-compose works without a certificate.
const ssl = process.env['DATABASE_SSL'] === 'true' ? { rejectUnauthorized: false } : false;

const pool = new Pool({ connectionString: process.env['DATABASE_URL'], ssl });

export default pool;
