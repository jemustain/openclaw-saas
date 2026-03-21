import express from 'express';
import { authMiddleware } from './middleware/auth';
import healthRouter from './routes/health';
import openclawRouter from './routes/openclaw';
import heartbeatRouter from './routes/heartbeat';

const app = express();
const PORT = parseInt(process.env.PORT || '8787', 10);

app.use(express.json());

// Auth on all routes
app.use(authMiddleware);

// Routes
app.use(healthRouter);
app.use(openclawRouter);
app.use(heartbeatRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[sidecar] listening on port ${PORT}`);
});

export default app;
