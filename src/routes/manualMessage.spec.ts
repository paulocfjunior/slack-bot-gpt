import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Request, Response } from 'express';

import { OpenAIService } from '../services/openaiService';
import { SlackService } from '../services/slackService';
import { ThreadStorage } from '../utils/threadStorage';
import { handleSendMessage } from './manualMessage';

// Mock services
jest.mock('../services/slackService');
jest.mock('../services/openaiService');
jest.mock('../utils/threadStorage');

const MockedSlackService = jest.mocked(SlackService);
const MockedOpenAIService = jest.mocked(OpenAIService);
const MockedThreadStorage = jest.mocked(ThreadStorage);

const getMockResponse = (): jest.Mocked<Response> => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<Response>;
};

// Mock service interfaces
interface MockSlackService {
  lookupUserByUsername: jest.MockedFunction<
    (username: string) => Promise<string | null>
  >;
  openDirectMessage: jest.MockedFunction<
    (userId: string) => Promise<string | null>
  >;
  sendMarkdownMessage: jest.MockedFunction<
    (channel: string, text: string) => Promise<boolean>
  >;
  sendTypingIndicator: jest.MockedFunction<
    (channel: string) => Promise<string | null>
  >;
  validateToken: jest.MockedFunction<() => Promise<boolean>>;
}

interface MockOpenAIService {
  createThread: jest.MockedFunction<
    () => Promise<{
      id: string;
      object: string;
      created_at: number;
      metadata: Record<string, unknown>;
    }>
  >;
  addMessageToThread: jest.MockedFunction<
    (
      threadId: string,
      content: string,
    ) => Promise<{
      id: string;
      object: string;
      created_at: number;
      thread_id: string;
      role: string;
      content: Array<{
        type: string;
        text: { value: string; annotations: unknown[] };
      }>;
    }>
  >;
  createRun: jest.MockedFunction<
    (threadId: string) => Promise<{
      id: string;
      object: string;
      created_at: number;
      thread_id: string;
      assistant_id: string;
      status: string;
    }>
  >;
  getRunStatus: jest.MockedFunction<
    (
      threadId: string,
      runId: string,
    ) => Promise<{
      id: string;
      object: string;
      created_at: number;
      thread_id: string;
      assistant_id: string;
      status: string;
    }>
  >;
  waitForRunCompletion: jest.MockedFunction<
    (
      threadId: string,
      runId: string,
    ) => Promise<{
      id: string;
      object: string;
      created_at: number;
      thread_id: string;
      assistant_id: string;
      status: string;
    }>
  >;
  getThreadMessages: jest.MockedFunction<
    (threadId: string) => Promise<
      Array<{
        id: string;
        object: string;
        created_at: number;
        thread_id: string;
        role: string;
        content: Array<{
          type: string;
          text: { value: string; annotations: unknown[] };
        }>;
      }>
    >
  >;
  getLatestAssistantMessage: jest.MockedFunction<
    (threadId: string) => Promise<string>
  >;
}

interface MockThreadStorage {
  get: jest.MockedFunction<(userId: string) => string | undefined>;
  set: jest.MockedFunction<(userId: string, threadId: string) => void>;
  has: jest.MockedFunction<(userId: string) => boolean>;
  getAll: jest.MockedFunction<() => Record<string, string>>;
  delete: jest.MockedFunction<(userId: string) => void>;
  clear: jest.MockedFunction<() => void>;
  size: jest.MockedFunction<() => number>;
}

describe('handleSendMessage', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: jest.Mocked<Response>;
  let mockSlackService: MockSlackService;
  let mockOpenAIService: MockOpenAIService;
  let mockThreadStorage: MockThreadStorage;

  beforeEach(() => {
    // Reset environment
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_BOT_OPENAI_API_KEY = 'sk-test-openai-key';
    process.env.SLACK_BOT_OPENAI_ASSISTANT_ID = 'asst-test-assistant-id';

    // Create mock SlackService instance
    mockSlackService = {
      lookupUserByUsername: jest.fn() as jest.MockedFunction<
        (username: string) => Promise<string | null>
      >,
      openDirectMessage: jest.fn() as jest.MockedFunction<
        (userId: string) => Promise<string | null>
      >,
      sendMarkdownMessage: jest.fn() as jest.MockedFunction<
        (channel: string, text: string) => Promise<boolean>
      >,
      sendTypingIndicator: jest.fn() as jest.MockedFunction<
        (channel: string) => Promise<string | null>
      >,
      validateToken: jest.fn() as jest.MockedFunction<() => Promise<boolean>>,
    };

    // Create mock OpenAIService instance
    mockOpenAIService = {
      createThread: jest.fn() as jest.MockedFunction<
        () => Promise<{
          id: string;
          object: string;
          created_at: number;
          metadata: Record<string, unknown>;
        }>
      >,
      addMessageToThread: jest.fn() as jest.MockedFunction<
        (
          threadId: string,
          content: string,
        ) => Promise<{
          id: string;
          object: string;
          created_at: number;
          thread_id: string;
          role: string;
          content: Array<{
            type: string;
            text: { value: string; annotations: unknown[] };
          }>;
        }>
      >,
      createRun: jest.fn() as jest.MockedFunction<
        (threadId: string) => Promise<{
          id: string;
          object: string;
          created_at: number;
          thread_id: string;
          assistant_id: string;
          status: string;
        }>
      >,
      getRunStatus: jest.fn() as jest.MockedFunction<
        (
          threadId: string,
          runId: string,
        ) => Promise<{
          id: string;
          object: string;
          created_at: number;
          thread_id: string;
          assistant_id: string;
          status: string;
        }>
      >,
      waitForRunCompletion: jest.fn() as jest.MockedFunction<
        (
          threadId: string,
          runId: string,
        ) => Promise<{
          id: string;
          object: string;
          created_at: number;
          thread_id: string;
          assistant_id: string;
          status: string;
        }>
      >,
      getThreadMessages: jest.fn() as jest.MockedFunction<
        (threadId: string) => Promise<
          Array<{
            id: string;
            object: string;
            created_at: number;
            thread_id: string;
            role: string;
            content: Array<{
              type: string;
              text: { value: string; annotations: unknown[] };
            }>;
          }>
        >
      >,
      getLatestAssistantMessage: jest.fn() as jest.MockedFunction<
        (threadId: string) => Promise<string>
      >,
    };

    // Create mock ThreadStorage instance
    mockThreadStorage = {
      get: jest.fn() as jest.MockedFunction<
        (userId: string) => string | undefined
      >,
      set: jest.fn() as jest.MockedFunction<
        (userId: string, threadId: string) => void
      >,
      has: jest.fn() as jest.MockedFunction<(userId: string) => boolean>,
      getAll: jest.fn() as jest.MockedFunction<() => Record<string, string>>,
      delete: jest.fn() as jest.MockedFunction<(userId: string) => void>,
      clear: jest.fn() as jest.MockedFunction<() => void>,
      size: jest.fn() as jest.MockedFunction<() => number>,
    };

    // Mock constructors to return our mock instances
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MockedSlackService.mockImplementation(() => mockSlackService as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MockedOpenAIService.mockImplementation(() => mockOpenAIService as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MockedThreadStorage.mockImplementation(() => mockThreadStorage as any);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Request validation', () => {
    it('should return 400 when username query parameter is missing', async () => {
      mockRequest = {
        query: {},
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required as a query parameter',
      });
    });

    it('should return 400 when message body is missing', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: undefined,
      };
      mockResponse = getMockResponse();

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Message is required in the request body as plain text',
      });
    });

    it('should return 400 when message body is empty', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: '',
      };
      mockResponse = getMockResponse();

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Message is required in the request body as plain text',
      });
    });

    it('should handle username with @ symbol', async () => {
      mockRequest = {
        query: { username: '@testuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMarkdownMessage.mockResolvedValue(true);
      mockThreadStorage.get.mockReturnValue('thread_123');
      mockOpenAIService.addMessageToThread.mockResolvedValue({
        id: 'msg_123',
        object: 'thread.message',
        created_at: 1234567890,
        thread_id: 'thread_123',
        role: 'user',
        content: [
          { type: 'text', text: { value: 'Hello world', annotations: [] } },
        ],
      });

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockSlackService.lookupUserByUsername).toHaveBeenCalledWith(
        'testuser',
      );
    });
  });

  describe('User lookup', () => {
    it('should return 404 when user is not found', async () => {
      mockRequest = {
        query: { username: 'nonexistentuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue(null);

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: "User with username 'nonexistentuser' not found",
      });
    });
  });

  describe('Direct message channel', () => {
    it('should return 500 when DM channel cannot be opened', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue(null);

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to open direct message channel with user',
        userId: 'U1234567890',
      });
    });
  });

  describe('Message sending', () => {
    it('should return 500 when message fails to send', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMarkdownMessage.mockResolvedValue(false);
      mockThreadStorage.get.mockReturnValue('thread_123');
      mockOpenAIService.addMessageToThread.mockResolvedValue({
        id: 'msg_123',
        object: 'thread.message',
        created_at: 1234567890,
        thread_id: 'thread_123',
        role: 'user',
        content: [
          { type: 'text', text: { value: 'Hello world', annotations: [] } },
        ],
      });

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send message to user',
        userId: 'U1234567890',
        channelId: 'D1234567890',
      });
    });
  });

  describe('OpenAI thread management', () => {
    it('should create new thread when user has no existing thread', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMarkdownMessage.mockResolvedValue(true);
      mockThreadStorage.get.mockReturnValue(undefined);
      mockOpenAIService.createThread.mockResolvedValue({
        id: 'thread_new_123',
        object: 'thread',
        created_at: 1234567890,
        metadata: {},
      });
      mockOpenAIService.addMessageToThread.mockResolvedValue({
        id: 'msg_123',
        object: 'thread.message',
        created_at: 1234567890,
        thread_id: 'thread_new_123',
        role: 'user',
        content: [
          { type: 'text', text: { value: 'Hello world', annotations: [] } },
        ],
      });

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockThreadStorage.get).toHaveBeenCalledWith('U1234567890');
      expect(mockOpenAIService.createThread).toHaveBeenCalled();
      expect(mockThreadStorage.set).toHaveBeenCalledWith(
        'U1234567890',
        'thread_new_123',
      );
    });

    it('should use existing thread when user has one', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMarkdownMessage.mockResolvedValue(true);
      mockThreadStorage.get.mockReturnValue('thread_existing_123');
      mockOpenAIService.addMessageToThread.mockResolvedValue({
        id: 'msg_123',
        object: 'thread.message',
        created_at: 1234567890,
        thread_id: 'thread_existing_123',
        role: 'user',
        content: [
          { type: 'text', text: { value: 'Hello world', annotations: [] } },
        ],
      });

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockThreadStorage.get).toHaveBeenCalledWith('U1234567890');
      expect(mockOpenAIService.createThread).not.toHaveBeenCalled();
      expect(mockThreadStorage.set).not.toHaveBeenCalled();
    });

    it('should add message to thread with correct prompt format', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: 'Test message content',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMarkdownMessage.mockResolvedValue(true);
      mockThreadStorage.get.mockReturnValue('thread_123');
      mockOpenAIService.addMessageToThread.mockResolvedValue({
        id: 'msg_123',
        object: 'thread.message',
        created_at: 1234567890,
        thread_id: 'thread_123',
        role: 'user',
        content: [
          {
            type: 'text',
            text: { value: 'Test message content', annotations: [] },
          },
        ],
      });

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockOpenAIService.addMessageToThread).toHaveBeenCalledWith(
        'thread_123',
        expect.stringContaining(
          "There's a new message coming from the System to the user.",
        ),
      );
      expect(mockOpenAIService.addMessageToThread).toHaveBeenCalledWith(
        'thread_123',
        expect.stringContaining('Test message content'),
      );
    });

    it('should return 500 when thread creation fails', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMarkdownMessage.mockResolvedValue(true);
      mockThreadStorage.get.mockReturnValue(undefined);
      mockOpenAIService.createThread.mockRejectedValue(
        new Error('Thread creation failed'),
      );

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should return 500 when adding message to thread fails', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMarkdownMessage.mockResolvedValue(true);
      mockThreadStorage.get.mockReturnValue('thread_123');
      mockOpenAIService.addMessageToThread.mockRejectedValue(
        new Error('Failed to add message'),
      );

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('Successful message sending', () => {
    it('should return 200 with success response when message is sent', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMarkdownMessage.mockResolvedValue(true);
      mockThreadStorage.get.mockReturnValue('thread_123');
      mockOpenAIService.addMessageToThread.mockResolvedValue({
        id: 'msg_123',
        object: 'thread.message',
        created_at: 1234567890,
        thread_id: 'thread_123',
        role: 'user',
        content: [
          { type: 'text', text: { value: 'Hello world', annotations: [] } },
        ],
      });

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Message sent successfully to testuser',
        userId: 'U1234567890',
        channelId: 'D1234567890',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should call services in correct order', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMarkdownMessage.mockResolvedValue(true);
      mockThreadStorage.get.mockReturnValue('thread_123');
      mockOpenAIService.addMessageToThread.mockResolvedValue({
        id: 'msg_123',
        object: 'thread.message',
        created_at: 1234567890,
        thread_id: 'thread_123',
        role: 'user',
        content: [
          { type: 'text', text: { value: 'Hello world', annotations: [] } },
        ],
      });

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      // Verify the order of calls
      expect(mockSlackService.lookupUserByUsername).toHaveBeenCalledWith(
        'testuser',
      );
      expect(mockSlackService.openDirectMessage).toHaveBeenCalledWith(
        'U1234567890',
      );
      expect(mockSlackService.sendMarkdownMessage).toHaveBeenCalledWith(
        'D1234567890',
        'Hello world',
      );
      expect(mockThreadStorage.get).toHaveBeenCalledWith('U1234567890');
      expect(mockOpenAIService.addMessageToThread).toHaveBeenCalledWith(
        'thread_123',
        expect.stringContaining('Hello world'),
      );
    });
  });

  describe('Error handling', () => {
    it('should return 500 when an unexpected error occurs', async () => {
      mockRequest = {
        query: { username: 'testuser' },
        body: 'Hello world',
      };
      mockResponse = getMockResponse();

      mockSlackService.lookupUserByUsername.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });
  });
});
