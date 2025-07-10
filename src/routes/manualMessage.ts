import { Request, Response } from 'express';

import InsightBuilder from '../services/blockBuilder';
import { OpenAIService } from '../services/openaiService';
import { SlackService } from '../services/slackService';
import {
  KPIImageChartData,
  generateKPIImage,
  generateKPIImageChart,
} from '../utils/generateKpiImage';
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

    function generateRandomKPINumbers(): number[] {
      return Array.from({ length: 7 }, () => Math.floor(Math.random() * 100));
    }

    const testData: KPIImageChartData = {
      kpiLeadsValue: '875',
      kpiLeadsDiff: -0.28,
      kpiBookingRateValue: '92%',
      kpiBookingRateDiff: 0.08,
      kpiRevenuePerJobValue: '$569',
      kpiRevenuePerJobDiff: -0.56,
      kpiRevenueValue: '$0.46 M',
      kpiRevenueDiff: -0.36,
      kpiLeadsDataArray: generateRandomKPINumbers(),
      kpiBookingRateDataArray: generateRandomKPINumbers(),
      kpiRevenuePerJobDataArray: generateRandomKPINumbers(),
      kpiRevenueDataArray: generateRandomKPINumbers(),
    };

    const buffer = await generateKPIImageChart(testData);

    const insightBuilder = new InsightBuilder();

    insightBuilder.text('Here are your daily insights:');

    const result = await slackService.uploadImage(buffer, 'kpi.png');
    if (result) {
      const [permalink, fileId] = result;

      const isUploaded = await slackService.waitForFileUpload(fileId);

      if (isUploaded === false) {
        const response: SendMessageResponse = {
          success: false,
          error: 'KPI image was not uploaded',
        };
        res.status(500).json(response);
        return;
      }

      insightBuilder.image(permalink);
    }

    insightBuilder
      .insight(
        'Inbound Leads (inbound calls greater than 30s) from New Customers fell 30%.',
        'Discuss with Marketing if there has been a drop in leads coming from Ad campaigns.',
      )
      .insight(
        "This week's funnel is pacing 92% to target - keep up the momentum and you'll beat budget by Friday.",
        'One liner - one action you can take today to improve the above stat',
      )
      .insight(
        'Revenue per Job (T2W) has dropped 56%.',
        "Project Manager A has a 30% close rate missing the target by 10 percentage points. Are they following Larrin's sales training?  How many estimates are they creating per sales job?",
        'Overall Service Revenue per Job dropped to $289 (target = $325) since all technicians have not met the target. Review the # estimates created per service job and time on job. You may also want to review service job pricing',
      )
      .insight(
        'Total Sales Opportunities (T2W) has been 166 opportunities missing the 354 target.',
        'On Service Jobs, Technician TO%has dropped to 31% (target = 40%) due to Technician A TO% = 12% and Technician D TO% = 14%.  Understand if their jobs were on equipment over 10+ years and coach them turning over jobs with high repair costs.',
        'On Maintenance Jobs, the number of Replacement Opportunities been down 14% from previous month due to 35% lower maintenance calls performed.  Review customer memberships to increase maintenance call bookings',
      );

    // Send the message
    const messageSent = await slackService.sendBlocks(
      channelId,
      insightBuilder.getBlocks(),
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
