import express from 'express';
import healthRouter from './routes/health';
import tripsRouter from './routes/trips';
import membersRouter from './routes/members';
import preferencesRouter from './routes/preferences';
import destinationsRouter from './routes/destinations';
import scoreRouter from './routes/score';

const app = express();
app.use(express.json());

app.use(healthRouter);
app.use(tripsRouter);
app.use('/trips/:tripId/members', membersRouter);
app.use('/trips/:tripId/members/:memberId/preferences', preferencesRouter);
app.use('/trips/:tripId/score', scoreRouter);
app.use(destinationsRouter);

export default app;
