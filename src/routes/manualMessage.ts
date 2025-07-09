import { Request, Response } from 'express';

import { OpenAIService } from '../services/openaiService';
import { SlackService } from '../services/slackService';
import { ThreadStorage } from '../utils/threadStorage';

interface SendMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
  userId?: string;
  channelId?: string;
}

/**
 * Handles sending a manual message to a user via the Slack bot
 *
 * @api {POST} /api/send-message?username={username} Send Message
 * @apiParam {String} username - The Slack username (query parameter)
 * @apiBody {String|Object} message - The message content (supports both plain text and JSON with message field)
 *
 * @example
 * // Plain text (recommended for markdown)
 * curl -X POST -H 'Content-type: text/plain' \
 *   -d "Hello! This is a **bold** message with\nline breaks." \
 *   "http://localhost:3000/api/send-message?username=john.doe"
 *
 * @example
 * // JSON format (backward compatibility)
 * curl -X POST -H 'Content-type: application/json' \
 *   -d '{"message": "Hello! This is a **bold** message with\\nline breaks."}' \
 *   "http://localhost:3000/api/send-message?username=john.doe"
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export const handleSendMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Get username from query parameter
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      const response: SendMessageResponse = {
        success: false,
        error: 'Username is required as a query parameter',
      };
      res.status(400).json(response);
      return;
    }

    // Get message from request body (already parsed by middleware)
    const message = req.body as string;

    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length === 0
    ) {
      const response: SendMessageResponse = {
        success: false,
        error: 'Message is required in the request body as plain text',
      };
      res.status(400).json(response);
      return;
    }

    // Initialize Slack service
    const slackService = new SlackService(process.env.SLACK_BOT_TOKEN!);

    // Clean username (remove @ if present)
    const cleanUsername = username.startsWith('@')
      ? username.slice(1)
      : username;

    // Look up user by username
    const userId = await slackService.lookupUserByUsername(cleanUsername);
    if (!userId) {
      const response: SendMessageResponse = {
        success: false,
        error: `User with username '${username}' not found`,
      };
      res.status(404).json(response);
      return;
    }

    // Open direct message channel with the user
    const channelId = await slackService.openDirectMessage(userId);
    if (!channelId) {
      const response: SendMessageResponse = {
        success: false,
        error: 'Failed to open direct message channel with user',
        userId,
      };
      res.status(500).json(response);
      return;
    }

    // Send the message
    const messageSent = await slackService.sendMarkdownMessage(
      channelId,
      message,
    );
    if (!messageSent) {
      const response: SendMessageResponse = {
        success: false,
        error: 'Failed to send message to user',
        userId,
        channelId,
      };
      res.status(500).json(response);
      return;
    }

    const openaiService = new OpenAIService(
      process.env.SLACK_BOT_OPENAI_API_KEY!,
      process.env.SLACK_BOT_OPENAI_ASSISTANT_ID!,
    );
    const threadStorage = new ThreadStorage();
    let threadId = threadStorage.get(userId);

    if (!threadId) {
      console.log(`Creating new thread for user ${userId}`);
      const thread = await openaiService.createThread();
      threadId = thread.id;
      threadStorage.set(userId, threadId);
    }
    const prompt = `
    There's a new message coming from the System to the user.
    The user is aware of the message and its content.
    You don't need to respond to the message, you just need to save it on the context.
    The message is:
    ${message}
    `;
    await openaiService.addMessageToThread(threadId, prompt);

    // Success response
    const response: SendMessageResponse = {
      success: true,
      message: `Message sent successfully to ${username}`,
      userId,
      channelId,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in handleSendMessage:', error);
    const response: SendMessageResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
};
