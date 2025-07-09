import dotenv from 'dotenv';
import express from 'express';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { sendMessageBodyParser } from './middleware/sendMessageBodyParser';
import { slackBodyParser } from './middleware/slackBodyParser';
import routes from './routes';
import { printRoutes } from './utils/routeInspector';
import { setupGracefulProcessEnd } from './utils/setupGracefulProcessEnd';
import { validateEnvVars } from './utils/validateEnvVars';

dotenv.config({
  quiet: true,
  override: true,
});

validateEnvVars();
setupGracefulProcessEnd();

const app = express();
const PORT = process.env.PORT || 3000;

// Slack events endpoint - raw body for signature verification (MUST come before JSON parsing)
app.use('/slack/events', express.raw({ type: 'application/json' }));
app.use('/slack/events', slackBodyParser);

// Send message endpoint - flexible body parsing for both text and JSON
app.use('/api/send-message', express.raw({ type: '*/*' }));
app.use('/api/send-message', sendMessageBodyParser);

// Default JSON parsing for other endpoints (comes after route-specific middleware)
app.use(express.json());

app.use('/', routes);
app.use(errorHandler);
app.use('*', notFoundHandler);

app.listen(PORT, () => {
  console.info(`Server is running on port ${PORT}`);
  printRoutes(app._router.stack);
});
