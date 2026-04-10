import express from 'express';
import { authMiddleware } from './middleware/auth';
import healthRouter from './routes/health';
import openclawRouter from './routes/openclaw';
import heartbeatRouter from './routes/heartbeat';
import skillsRouter from './routes/skills';
import messagingRouter from './routes/messaging';
import usageRouter from './routes/usage';
import { startUsageTracker } from './services/usage-tracker';

const app = express();
const PORT = parseInt(process.env.PORT || '8787', 10);

app.use(express.json());

// Auth on all routes
app.use(authMiddleware);

// Routes
app.use(healthRouter);
app.use(openclawRouter);
app.use(heartbeatRouter);
app.use(skillsRouter);
app.use(messagingRouter);
app.use(usageRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[sidecar] listening on port ${PORT}`);
  startUsageTracker().catch((err) => {
    console.warn('[sidecar] usage tracker failed to start:', err.message);
  });
});

export default app;
