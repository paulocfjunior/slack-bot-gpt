import { NextFunction, Request, Response } from 'express';

export const sendMessageBodyParser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const rawBody = req.body;
  let message: string;

  // Handle different body types for send-message endpoint
  if (Buffer.isBuffer(rawBody)) {
    message = rawBody.toString('utf8');
  } else if (typeof rawBody === 'string') {
    message = rawBody;
  } else if (typeof rawBody === 'object' && rawBody !== null) {
    // If it's already parsed as JSON, try to extract the message
    if (rawBody.message && typeof rawBody.message === 'string') {
      message = rawBody.message;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Message is required in the request body',
      });
    }
  } else {
    return res.status(400).json({
      success: false,
      error:
        'Invalid body format. Expected plain text or JSON with message field.',
    });
  }

  // Validate message is not empty
  if (!message || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Message cannot be empty',
    });
  }

  // Set the message as the body for downstream handlers
  req.body = message;

  next();
};
