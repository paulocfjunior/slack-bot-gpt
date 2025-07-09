import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Request, Response } from 'express';

import * as openaiServiceModule from '../services/openaiService';
import * as slackServiceModule from '../services/slackService';
import * as slackVerifier from '../utils/slackVerifier';
import * as threadStorageModule from '../utils/threadStorage';
import * as slackEventsModule from './slackEvents';

// Mocks
jest.mock('../services/openaiService');
jest.mock('../services/slackService');
jest.mock('../utils/threadStorage');

const getMockResponse = (): jest.Mocked<Response> => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<Response>;
};

const createMockAsyncFunction = <T>(value: T) => {
  return jest.fn().mockImplementation(() => Promise.resolve(value));
};

// Mock service interfaces
interface MockSlackService {
  sendTypingIndicator: jest.MockedFunction<() => Promise<string | null>>;
  sendMessage: jest.MockedFunction<
    (channel: string, text: string) => Promise<boolean>
  >;
  deleteMessage: jest.MockedFunction<
    (channel: string, ts: string) => Promise<boolean>
  >;
}

interface MockOpenAIService {
  createThread: jest.MockedFunction<() => Promise<{ id: string }>>;
  addMessageToThread: jest.MockedFunction<
    (threadId: string, content: string) => Promise<unknown>
  >;
  createRun: jest.MockedFunction<(threadId: string) => Promise<{ id: string }>>;
  waitForRunCompletion: jest.MockedFunction<
    (threadId: string, runId: string) => Promise<unknown>
  >;
  getLatestAssistantMessage: jest.MockedFunction<
    (threadId: string) => Promise<string>
  >;
}

interface MockThreadStorage {
  get: jest.MockedFunction<(userId: string) => string | undefined>;
  set: jest.MockedFunction<(userId: string, threadId: string) => void>;
}

describe('handleSlackEvents', () => {
  let mockReq: Partial<Request> & { rawBody?: Buffer };
  let mockRes: jest.Mocked<Response>;
  let validateTimestampSpy: jest.MockedFunction<
    typeof slackVerifier.validateTimestamp
  >;
  let verifySlackSignatureSpy: jest.MockedFunction<
    typeof slackVerifier.verifySlackSignature
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_BOT_OPENAI_API_KEY = 'sk-test-openai-key';
    process.env.SLACK_BOT_OPENAI_ASSISTANT_ID = 'asst-test-assistant-id';
    process.env.SLACK_BOT_APP_ID = 'APP123';

    validateTimestampSpy = jest.spyOn(
      slackVerifier,
      'validateTimestamp',
    ) as jest.MockedFunction<typeof slackVerifier.validateTimestamp>;
    validateTimestampSpy.mockReturnValue(true);
    verifySlackSignatureSpy = jest.spyOn(
      slackVerifier,
      'verifySlackSignature',
    ) as jest.MockedFunction<typeof slackVerifier.verifySlackSignature>;
    verifySlackSignatureSpy.mockReturnValue(true);
  });

  it('should return 400 if required headers are missing', async () => {
    mockReq = { headers: {}, body: {}, rawBody: Buffer.from('') };
    mockRes = getMockResponse();
    await slackEventsModule.handleSlackEvents(
      mockReq as Request,
      mockRes as Response,
    );
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Missing required headers',
    });
  });

  it('should return 400 if timestamp is too old', async () => {
    mockReq = {
      headers: {
        'x-slack-signature': 'sig',
        'x-slack-request-timestamp': '123',
      },
      body: {},
      rawBody: Buffer.from(''),
    };
    mockRes = getMockResponse();
    validateTimestampSpy.mockReturnValue(false);
    await slackEventsModule.handleSlackEvents(
      mockReq as Request,
      mockRes as Response,
    );
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Request timestamp is too old',
    });
  });

  it('should return 401 if signature is invalid', async () => {
    mockReq = {
      headers: {
        'x-slack-signature': 'sig',
        'x-slack-request-timestamp': '123',
      },
      body: {},
      rawBody: Buffer.from(''),
    };
    mockRes = getMockResponse();
    validateTimestampSpy.mockReturnValue(true);
    verifySlackSignatureSpy.mockReturnValue(false);
    await slackEventsModule.handleSlackEvents(
      mockReq as Request,
      mockRes as Response,
    );
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
  });

  it('should handle Slack URL verification challenge', async () => {
    mockReq = {
      headers: {
        'x-slack-signature': 'sig',
        'x-slack-request-timestamp': '123',
      },
      body: { type: 'url_verification', challenge: 'abc123' },
      rawBody: Buffer.from(''),
    };
    mockRes = getMockResponse();
    await slackEventsModule.handleSlackEvents(
      mockReq as Request,
      mockRes as Response,
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ challenge: 'abc123' });
  });

  it('should ignore non-DM events', async () => {
    mockReq = {
      headers: {
        'x-slack-signature': 'sig',
        'x-slack-request-timestamp': '123',
      },
      body: {
        type: 'event_callback',
        event: {
          type: 'message',
          user: 'U123',
          channel: 'C123', // not a DM
        },
      },
      rawBody: Buffer.from(''),
    };
    mockRes = getMockResponse();
    await slackEventsModule.handleSlackEvents(
      mockReq as Request,
      mockRes as Response,
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
  });

  it('should ignore events from itself', async () => {
    mockReq = {
      headers: {
        'x-slack-signature': 'sig',
        'x-slack-request-timestamp': '123',
      },
      body: {
        type: 'event_callback',
        event: {
          type: 'message',
          user: 'U123',
          channel: 'D123',
          app_id: 'APP123',
        },
      },
      rawBody: Buffer.from(''),
    };
    mockRes = getMockResponse();
    await slackEventsModule.handleSlackEvents(
      mockReq as Request,
      mockRes as Response,
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
  });

  it('should process valid DM events and respond immediately', async () => {
    const sendTypingIndicatorMock =
      createMockAsyncFunction('1234567890.123456');
    const sendMessageMock = createMockAsyncFunction(true);
    const addMessageToThreadMock = createMockAsyncFunction({});
    const createThreadMock = createMockAsyncFunction({ id: 'thread_1' });
    const createRunMock = createMockAsyncFunction({ id: 'run_1' });
    const waitForRunCompletionMock = createMockAsyncFunction({});
    const getLatestAssistantMessageMock =
      createMockAsyncFunction('AI response');
    const deleteMessageMock = createMockAsyncFunction(true);

    const mockSlackService: MockSlackService = {
      sendTypingIndicator: sendTypingIndicatorMock as jest.MockedFunction<
        () => Promise<string | null>
      >,
      sendMessage: sendMessageMock as jest.MockedFunction<
        (channel: string, text: string) => Promise<boolean>
      >,
      deleteMessage: deleteMessageMock as jest.MockedFunction<
        (channel: string, ts: string) => Promise<boolean>
      >,
    };

    const mockOpenAIService: MockOpenAIService = {
      createThread: createThreadMock as jest.MockedFunction<
        () => Promise<{ id: string }>
      >,
      addMessageToThread: addMessageToThreadMock as jest.MockedFunction<
        (threadId: string, content: string) => Promise<unknown>
      >,
      createRun: createRunMock as jest.MockedFunction<
        (threadId: string) => Promise<{ id: string }>
      >,
      waitForRunCompletion: waitForRunCompletionMock as jest.MockedFunction<
        (threadId: string, runId: string) => Promise<unknown>
      >,
      getLatestAssistantMessage:
        getLatestAssistantMessageMock as jest.MockedFunction<
          (threadId: string) => Promise<string>
        >,
    };

    jest
      .mocked(slackServiceModule.SlackService)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => mockSlackService as any);

    jest
      .mocked(openaiServiceModule.OpenAIService)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => mockOpenAIService as any);

    const mockThreadStorage: MockThreadStorage = {
      get: jest.fn().mockReturnValue(undefined) as jest.MockedFunction<
        (userId: string) => string | undefined
      >,
      set: jest.fn() as jest.MockedFunction<
        (userId: string, threadId: string) => void
      >,
    };

    jest.spyOn(threadStorageModule, 'ThreadStorage').mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return mockThreadStorage as any;
    });

    mockReq = {
      headers: {
        'x-slack-signature': 'sig',
        'x-slack-request-timestamp': '123',
      },
      body: {
        type: 'event_callback',
        event: {
          type: 'message',
          user: 'U123',
          channel: 'D123',
          app_id: 'OTHER_APP',
          text: 'Hello',
        },
      },
      rawBody: Buffer.from(''),
    };
    mockRes = getMockResponse();
    await slackEventsModule.handleSlackEvents(
      mockReq as Request,
      mockRes as Response,
    );
    expect(sendTypingIndicatorMock).toHaveBeenCalledWith('D123');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
  });

  it('should return 500 on unexpected errors', async () => {
    mockReq = {
      headers: {
        'x-slack-signature': 'sig',
        'x-slack-request-timestamp': '123',
      },
      // purposely invalid body to trigger error
      body: null,
      rawBody: Buffer.from(''),
    };
    mockRes = getMockResponse();
    await slackEventsModule.handleSlackEvents(
      mockReq as Request,
      mockRes as Response,
    );
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });
});
