import { NextFunction, Request, Response } from 'express';

export const slackBodyParser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody)) {
    console.error('Expected Buffer for Slack events, got:', typeof rawBody);
    return res
      .status(400)
      .json({ error: 'Invalid body format for Slack events' });
  }

  const bodyString = rawBody.toString('utf8');
  let parsedBody;

  try {
    parsedBody = JSON.parse(bodyString);
  } catch (error) {
    console.error('Invalid JSON body', error);
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Attach both to req for downstream use
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).rawBody = bodyString; // Store the original string for signature verification
  req.body = parsedBody;

  next();
};
