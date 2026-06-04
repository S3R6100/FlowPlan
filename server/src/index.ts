import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import scheduleRoutes from './routes/schedule.js';
import tasksRoutes from './routes/tasks.js';
import goalsRoutes from './routes/goals.js';
import routinesRoutes from './routes/routines.js';
import weekRoutes from './routes/week.js';
import sessionsRoutes from './routes/sessions.js';
import milestonesRoutes from './routes/milestones.js';
import missionsRoutes from './routes/missions.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'flowplan-api', version: '0.1.0' });
});

app.use('/auth', authRoutes);
app.use('/events', eventsRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/tasks', tasksRoutes);
app.use('/goals', goalsRoutes);
app.use('/routines', routinesRoutes);
app.use('/week', weekRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/milestones', milestonesRoutes);
app.use('/missions', missionsRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FlowPlan API listening on http://0.0.0.0:${PORT}`);
});
