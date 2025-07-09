import dotenv from 'dotenv';
import express from 'express';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
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

app.use(express.json());
app.use('/slack/events', express.raw({ type: 'application/json' }));
app.use('/slack/events', slackBodyParser);
app.use('/', routes);
app.use(errorHandler);
app.use('*', notFoundHandler);

app.listen(PORT, () => {
  console.info(`Server is running on port ${PORT}`);
  printRoutes(app._router.stack);
});
