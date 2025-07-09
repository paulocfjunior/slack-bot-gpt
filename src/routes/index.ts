import { Router } from 'express';

import { debugRouter } from './debug';
import { healthRouter } from './health';
import { handleSendMessage } from './manualMessage';
import { handleSlackEvents } from './slackEvents';

const router = Router();

router.post('/slack/events', handleSlackEvents);

router.use('/', healthRouter);
router.use('/debug', debugRouter);

const apiRouter = Router();
apiRouter.post('/send-message', handleSendMessage);

router.use('/api', apiRouter);

export default router;
