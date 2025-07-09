import { Request, Response } from 'express';
import { SlackService } from '../services/slackService';
import { OpenAIService } from '../services/openaiService';
import { ThreadStorage } from '../utils/threadStorage';

// Types for the request body
interface SendMessageRequest {
  username: string;
  message: string;
}

// Types for the response
interface SendMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
  userId?: string;
  channelId?: string;
}

/**
 * Validates the request body for sending a manual message
 * @param body - The request body
 * @returns Validation result with error message if invalid
 */
const validateSendMessageRequest = (body: any): { isValid: boolean; error?: string } => {
  if (!body) {
    return { isValid: false, error: 'Request body is required' };
  }

  if (!body.username || typeof body.username !== 'string') {
    return { isValid: false, error: 'Username is required and must be a string' };
  }

  if (!body.message || typeof body.message !== 'string') {
    return { isValid: false, error: 'Message is required and must be a string' };
  }

  if (body.username.trim().length === 0) {
    return { isValid: false, error: 'Username cannot be empty' };
  }

  if (body.message.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  return { isValid: true };
};

/**
 * Handles sending a manual message to a user via the Slack bot
 * @param req - Express request object
 * @param res - Express response object
 */
export const handleSendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validation = validateSendMessageRequest(req.body);
    if (!validation.isValid) {
      const response: SendMessageResponse = {
        success: false,
        error: validation.error,
      };
      res.status(400).json(response);
      return;
    }

    const { username, message } = req.body as SendMessageRequest;

    // Initialize Slack service
    const slackService = new SlackService(process.env.SLACK_BOT_TOKEN!);

    // Clean username (remove @ if present)
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

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
    const messageSent = await slackService.sendMessage(channelId, message);
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

    const openaiService = new OpenAIService(process.env.SLACK_BOT_OPENAI_API_KEY!, process.env.SLACK_BOT_OPENAI_ASSISTANT_ID!);
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