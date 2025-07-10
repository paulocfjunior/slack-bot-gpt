import { Router } from 'express';

import { debugRouter } from './debug';
import { healthRouter } from './health';
import { handleSendMessage } from './manualMessage';
import { handleSlackEvents } from './slackEvents';
import { handleRefreshUserCache } from './userCache';

const router = Router();

router.post('/slack/events', handleSlackEvents);

router.use('/', healthRouter);
router.use('/debug', debugRouter);

const apiRouter = Router();
apiRouter.post('/send-message', handleSendMessage);
apiRouter.post('/refresh-user-cache', handleRefreshUserCache);

router.use('/api', apiRouter);

export default router;
