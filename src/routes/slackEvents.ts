import { Request, Response } from 'express';

import { OpenAIService } from '../services/openaiService';
import { SlackService } from '../services/slackService';
import {
  validateTimestamp,
  verifySlackSignature,
} from '../utils/slackVerifier';
import { ThreadStorage } from '../utils/threadStorage';

// Persistent storage for user -> thread mapping
const threadStorage = new ThreadStorage();

// Types for Slack events
interface SlackEvent {
  app_id: string;
  type: string;
  user: string;
  text: string;
  channel: string;
  ts: string;
  event_ts: string;
  hidden?: boolean;
}

interface SlackEventWrapper {
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackEvent;
  type: string;
  event_id: string;
  event_time: number;
}

/**
 * Handles Slack URL verification challenge
 * @param req - Express request object
 * @param res - Express response object
 */
const handleUrlVerification = (req: Request, res: Response): void => {
  const { challenge } = req.body;

  if (challenge) {
    console.log('Slack URL verification challenge received');
    res.status(200).json({ challenge });
  } else {
    res.status(400).json({ error: 'Invalid challenge' });
  }
};

/**
 * Processes a direct message event from Slack
 * @param event - The Slack event object
 * @param openaiService - OpenAI service instance
 * @param slackService - Slack service instance
 */
const handleDirectMessage = async (
  event: SlackEvent,
  openaiService: OpenAIService,
  slackService: SlackService,
  messageTs?: string | null,
): Promise<void> => {
  const userId = event.user;
  const userMessage = event.text;

  console.log(`Processing DM from user ${userId}: ${userMessage}`);

  try {
    // Get or create thread for this user
    let threadId = threadStorage.get(userId);

    if (!threadId) {
      console.log(`Creating new thread for user ${userId}`);
      const thread = await openaiService.createThread();
      threadId = thread.id;
      threadStorage.set(userId, threadId);
    }

    // Add user message to thread
    await openaiService.addMessageToThread(threadId, userMessage);

    // Create and start a run
    const run = await openaiService.createRun(threadId);
    console.log(`Started run ${run.id} for user ${userId}`);

    // Wait for run to complete
    await openaiService.waitForRunCompletion(threadId, run.id);
    console.log(`Run ${run.id} completed for user ${userId}`);

    // Get assistant's response
    const assistantResponse =
      await openaiService.getLatestAssistantMessage(threadId);

    if (messageTs) {
      await slackService.deleteMessage(userId, messageTs);
    }

    const success = await slackService.sendMessage(userId, assistantResponse);

    if (success) {
      console.log(`Successfully sent response to user ${userId}`);
    } else {
      console.error(`Failed to send response to user ${userId}`);
    }
  } catch (error) {
    console.error(`Error processing message for user ${userId}:`, error);

    // Send error message to user
    const errorMessage =
      'Sorry, I encountered an error processing your message. Please try again.';
    await slackService.sendMessage(userId, errorMessage);
  }
};

/**
 * Main handler for Slack events
 * @param req - Express request object
 * @param res - Express response object
 */
export const handleSlackEvents = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Verify Slack signature
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody = (req as any).rawBody as Buffer;

    if (!signature || !timestamp || !signingSecret) {
      console.error('Missing required headers or signing secret');
      res.status(400).json({ error: 'Missing required headers' });
      return;
    }

    // Validate timestamp
    if (!validateTimestamp(timestamp)) {
      console.error('Request timestamp is too old');
      res.status(400).json({ error: 'Request timestamp is too old' });
      return;
    }
    // Verify signature using the raw buffer
    if (!verifySlackSignature(rawBody, signature, timestamp, signingSecret)) {
      console.error('Invalid Slack signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Handle URL verification challenge
    if (req.body.type === 'url_verification') {
      handleUrlVerification(req, res);
      return;
    }

    // Handle events
    if (req.body.type === 'event_callback') {
      const eventWrapper: SlackEventWrapper = req.body;
      const event = eventWrapper.event;

      // Only handle direct messages
      if (
        event.type === 'message' &&
        event.user &&
        !event.hidden &&
        event.channel.startsWith('D')
      ) {
        const appId = event.app_id;
        if (appId === process.env.SLACK_BOT_APP_ID) {
          console.log('Acknoledged message from itself event', appId);
          res.status(200).json({ ok: true });
          return;
        }

        const slackService = new SlackService(process.env.SLACK_BOT_TOKEN!);
        console.log('event', event);
        const messageTs = await slackService.sendTypingIndicator(event.channel);

        // Initialize services
        const openaiService = new OpenAIService(
          process.env.SLACK_BOT_OPENAI_API_KEY!,
          process.env.SLACK_BOT_OPENAI_ASSISTANT_ID!,
        );

        // Process the message asynchronously
        handleDirectMessage(
          event,
          openaiService,
          slackService,
          messageTs,
        ).catch(error => {
          console.error('Error in async message processing:', error);
        });

        // Respond immediately to Slack
        res.status(200).json({ ok: true });
      } else {
        console.log('Not a direct message, just acknowledging', event);
        // Not a direct message, just acknowledge
        res.status(200).json({ ok: true });
      }
    } else {
      console.log('Unknown event type, just acknowledging', req.body.type);
      // Unknown event type, just acknowledge
      res.status(200).json({ ok: true });
    }
  } catch (error) {
    console.error('Error handling Slack event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
