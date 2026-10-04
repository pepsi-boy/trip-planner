import express from 'express';
import path from 'path';
import healthRouter from './routes/health';
import tripsRouter from './routes/trips';
import membersRouter from './routes/members';
import preferencesRouter from './routes/preferences';
import destinationsRouter from './routes/destinations';
import scoreRouter from './routes/score';

const app = express();
app.use(express.json());

// Serve the React build in production
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

app.use(healthRouter);
app.use(tripsRouter);
app.use('/trips/:tripId/members', membersRouter);
app.use('/trips/:tripId/members/:memberId/preferences', preferencesRouter);
app.use('/trips/:tripId/score', scoreRouter);
app.use(destinationsRouter);

// SPA fallback -- must be last
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

export default app;
