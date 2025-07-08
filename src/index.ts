import express from 'express';
import dotenv from 'dotenv';
import { handleSlackEvents } from './routes/slackEvents.js';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'SLACK_BOT_OPENAI_API_KEY',
  'SLACK_BOT_OPENAI_ASSISTANT_ID',
  'SLACK_BOT_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse raw body for Slack signature verification
app.use('/slack/events', express.raw({ type: 'application/json' }));

// Middleware to parse JSON for other routes
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug endpoint to view thread mappings (development only)
app.get('/debug/threads', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Import ThreadStorage dynamically to avoid circular dependency
  import('./utils/threadStorage.js').then(({ ThreadStorage }) => {
    const storage = new ThreadStorage();
    res.status(200).json({
      threadCount: storage.size(),
      threads: storage.getAll()
    });
  }).catch(error => {
    res.status(500).json({ error: 'Failed to load thread data' });
  });
});

// Slack events endpoint
app.post('/slack/events', async (req, res) => {
  const rawBody = req.body; // Buffer
  const bodyString = rawBody.toString('utf8');
  let parsedBody;
  try {
    parsedBody = JSON.parse(bodyString);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  // Attach both to req for downstream use
  (req as any).rawBody = rawBody;
  req.body = parsedBody;
  await handleSlackEvents(req, res);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Slack events endpoint: http://localhost:${PORT}/slack/events`);
  console.log(`Health check endpoint: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 