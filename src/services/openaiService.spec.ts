import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';
import { OpenAIService } from './openaiService';

// Mock axios
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('OpenAIService', () => {
  let openaiService: OpenAIService;
  const mockApiKey = 'sk-test-api-key';
  const mockAssistantId = 'asst-test-assistant-id';

  beforeEach(() => {
    openaiService = new OpenAIService(mockApiKey, mockAssistantId);
    jest.clearAllMocks();
  });

  describe('createThread', () => {
    it('should create a thread successfully', async () => {
      const mockThread = {
        id: 'thread_123',
        object: 'thread',
        created_at: 1234567890,
        metadata: {},
      };

      mockedAxios.post.mockResolvedValue({
        data: mockThread,
      });

      const result = await openaiService.createThread();

      expect(result).toEqual(mockThread);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/threads',
        {},
        {
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );
    });

    it('should throw error when API call fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      await expect(openaiService.createThread()).rejects.toThrow(
        'Failed to create OpenAI thread',
      );
    });
  });

  describe('addMessageToThread', () => {
    it('should add message to thread successfully', async () => {
      const threadId = 'thread_123';
      const content = 'Hello, assistant!';
      const mockMessage = {
        id: 'msg_123',
        object: 'thread.message',
        created_at: 1234567890,
        thread_id: threadId,
        role: 'user' as const,
        content: [
          {
            type: 'text',
            text: {
              value: content,
              annotations: [],
            },
          },
        ],
      };

      mockedAxios.post.mockResolvedValue({
        data: mockMessage,
      });

      const result = await openaiService.addMessageToThread(threadId, content);

      expect(result).toEqual(mockMessage);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        {
          role: 'user',
          content,
        },
        {
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );
    });

    it('should throw error when API call fails', async () => {
      const threadId = 'thread_123';
      const content = 'Hello, assistant!';

      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      await expect(
        openaiService.addMessageToThread(threadId, content),
      ).rejects.toThrow('Failed to add message to thread');
    });
  });

  describe('createRun', () => {
    it('should create run successfully', async () => {
      const threadId = 'thread_123';
      const mockRun = {
        id: 'run_123',
        object: 'thread.run',
        created_at: 1234567890,
        thread_id: threadId,
        assistant_id: mockAssistantId,
        status: 'queued' as const,
      };

      mockedAxios.post.mockResolvedValue({
        data: mockRun,
      });

      const result = await openaiService.createRun(threadId);

      expect(result).toEqual(mockRun);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `https://api.openai.com/v1/threads/${threadId}/runs`,
        {
          assistant_id: mockAssistantId,
        },
        {
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );
    });

    it('should throw error when API call fails', async () => {
      const threadId = 'thread_123';

      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      await expect(openaiService.createRun(threadId)).rejects.toThrow(
        'Failed to create OpenAI run',
      );
    });
  });

  describe('getRunStatus', () => {
    it('should get run status successfully', async () => {
      const threadId = 'thread_123';
      const runId = 'run_123';
      const mockRun = {
        id: runId,
        object: 'thread.run',
        created_at: 1234567890,
        thread_id: threadId,
        assistant_id: mockAssistantId,
        status: 'completed' as const,
      };

      mockedAxios.get.mockResolvedValue({
        data: mockRun,
      });

      const result = await openaiService.getRunStatus(threadId, runId);

      expect(result).toEqual(mockRun);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );
    });

    it('should throw error when API call fails', async () => {
      const threadId = 'thread_123';
      const runId = 'run_123';

      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(
        openaiService.getRunStatus(threadId, runId),
      ).rejects.toThrow('Failed to get run status');
    });
  });

  describe('waitForRunCompletion', () => {
    beforeEach(() => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        fn();
        return {} as unknown as NodeJS.Timeout;
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should wait for run completion successfully', async () => {
      const threadId = 'thread_123';
      const runId = 'run_123';
      const mockCompletedRun = {
        id: runId,
        object: 'thread.run',
        created_at: 1234567890,
        thread_id: threadId,
        assistant_id: mockAssistantId,
        status: 'completed' as const,
      };

      // Mock getRunStatus to return completed status immediately
      mockedAxios.get.mockResolvedValue({
        data: mockCompletedRun,
      });

      const result = await openaiService.waitForRunCompletion(threadId, runId);

      expect(result).toEqual(mockCompletedRun);
    });

    it('should wait through multiple status checks', async () => {
      const threadId = 'thread_123';
      const runId = 'run_123';
      const mockQueuedRun = {
        id: runId,
        object: 'thread.run',
        created_at: 1234567890,
        thread_id: threadId,
        assistant_id: mockAssistantId,
        status: 'queued' as const,
      };
      const mockInProgressRun = {
        id: runId,
        object: 'thread.run',
        created_at: 1234567890,
        thread_id: threadId,
        assistant_id: mockAssistantId,
        status: 'in_progress' as const,
      };
      const mockCompletedRun = {
        id: runId,
        object: 'thread.run',
        created_at: 1234567890,
        thread_id: threadId,
        assistant_id: mockAssistantId,
        status: 'completed' as const,
      };

      // Mock getRunStatus to return different statuses on subsequent calls
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockQueuedRun })
        .mockResolvedValueOnce({ data: mockInProgressRun })
        .mockResolvedValueOnce({ data: mockCompletedRun });

      const result = await openaiService.waitForRunCompletion(threadId, runId);

      expect(result).toEqual(mockCompletedRun);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should throw error when run fails', async () => {
      const threadId = 'thread_123';
      const runId = 'run_123';
      const mockFailedRun = {
        id: runId,
        object: 'thread.run',
        created_at: 1234567890,
        thread_id: threadId,
        assistant_id: mockAssistantId,
        status: 'failed' as const,
      };

      mockedAxios.get.mockResolvedValue({
        data: mockFailedRun,
      });

      await expect(
        openaiService.waitForRunCompletion(threadId, runId),
      ).rejects.toThrow('Run failed with status: failed');
    });

    it('should throw error when run is cancelled', async () => {
      const threadId = 'thread_123';
      const runId = 'run_123';
      const mockCancelledRun = {
        id: runId,
        object: 'thread.run',
        created_at: 1234567890,
        thread_id: threadId,
        assistant_id: mockAssistantId,
        status: 'cancelled' as const,
      };

      mockedAxios.get.mockResolvedValue({
        data: mockCancelledRun,
      });

      await expect(
        openaiService.waitForRunCompletion(threadId, runId),
      ).rejects.toThrow('Run failed with status: cancelled');
    });
  });

  describe('getThreadMessages', () => {
    it('should get thread messages successfully', async () => {
      const threadId = 'thread_123';
      const mockMessages = [
        {
          id: 'msg_1',
          object: 'thread.message',
          created_at: 1234567890,
          thread_id: threadId,
          role: 'user' as const,
          content: [
            {
              type: 'text',
              text: {
                value: 'Hello',
                annotations: [],
              },
            },
          ],
        },
        {
          id: 'msg_2',
          object: 'thread.message',
          created_at: 1234567891,
          thread_id: threadId,
          role: 'assistant' as const,
          content: [
            {
              type: 'text',
              text: {
                value: 'Hi there!',
                annotations: [],
              },
            },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        data: { data: mockMessages },
      });

      const result = await openaiService.getThreadMessages(threadId);

      expect(result).toEqual(mockMessages);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );
    });

    it('should throw error when API call fails', async () => {
      const threadId = 'thread_123';

      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(
        openaiService.getThreadMessages(threadId),
      ).rejects.toThrow('Failed to get thread messages');
    });
  });

  describe('getLatestAssistantMessage', () => {
    it('should get latest assistant message successfully', async () => {
      const threadId = 'thread_123';
      const mockMessages = [
        {
          id: 'msg_1',
          object: 'thread.message',
          created_at: 1234567890,
          thread_id: threadId,
          role: 'user' as const,
          content: [
            {
              type: 'text',
              text: {
                value: 'Hello',
                annotations: [],
              },
            },
          ],
        },
        {
          id: 'msg_2',
          object: 'thread.message',
          created_at: 1234567891,
          thread_id: threadId,
          role: 'assistant' as const,
          content: [
            {
              type: 'text',
              text: {
                value: 'Hi there! How can I help you?',
                annotations: [],
              },
            },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        data: { data: mockMessages },
      });

      const result = await openaiService.getLatestAssistantMessage(threadId);

      expect(result).toBe('Hi there! How can I help you?');
    });

    it('should throw error when no assistant message found', async () => {
      const threadId = 'thread_123';
      const mockMessages = [
        {
          id: 'msg_1',
          object: 'thread.message',
          created_at: 1234567890,
          thread_id: threadId,
          role: 'user' as const,
          content: [
            {
              type: 'text',
              text: {
                value: 'Hello',
                annotations: [],
              },
            },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        data: { data: mockMessages },
      });

      await expect(
        openaiService.getLatestAssistantMessage(threadId),
      ).rejects.toThrow('Failed to get assistant response');
    });

    it('should throw error when no text content found', async () => {
      const threadId = 'thread_123';
      const mockMessages = [
        {
          id: 'msg_1',
          object: 'thread.message',
          created_at: 1234567890,
          thread_id: threadId,
          role: 'assistant' as const,
          content: [
            {
              type: 'image',
              image: {
                file_id: 'file_123',
              },
            },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValue({
        data: { data: mockMessages },
      });

      await expect(
        openaiService.getLatestAssistantMessage(threadId),
      ).rejects.toThrow('Failed to get assistant response');
    });

    it('should throw error when getThreadMessages fails', async () => {
      const threadId = 'thread_123';

      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(
        openaiService.getLatestAssistantMessage(threadId),
      ).rejects.toThrow('Failed to get assistant response');
    });
  });

  describe('constructor', () => {
    it('should create instance with API key and assistant ID', () => {
      const service = new OpenAIService('sk-custom-key', 'asst-custom-id');
      expect(service).toBeInstanceOf(OpenAIService);
    });

    it('should handle empty API key and assistant ID', () => {
      const service = new OpenAIService('', '');
      expect(service).toBeInstanceOf(OpenAIService);
    });
  });
});
