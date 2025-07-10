import { Request, Response } from 'express';

import { SlackService } from '../services/slackService';

export const handleRefreshUserCache = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const slackService = new SlackService(process.env.SLACK_BOT_TOKEN!);
  await slackService.refreshUserCache();
  res.status(200).json(slackService.getUserCache());
};
