import { NextFunction, Request, Response } from 'express';

// Error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
};
