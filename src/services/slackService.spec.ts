import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';
import { SlackService } from './slackService';

// Mock axios
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('SlackService', () => {
  let slackService: SlackService;
  const mockBotToken = 'xoxb-test-token';

  beforeEach(() => {
    slackService = new SlackService(mockBotToken);
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const channel = 'U1234567890';
      const text = 'Hello, world!';
      
      mockedAxios.post.mockResolvedValue({
        data: { ok: true },
      });

      const result = await slackService.sendMessage(channel, text);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          channel,
          text,
        },
        {
          headers: {
            Authorization: `Bearer ${mockBotToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should return false when Slack API returns error', async () => {
      const channel = 'U1234567890';
      const text = 'Hello, world!';
      
      mockedAxios.post.mockResolvedValue({
        data: { ok: false, error: 'channel_not_found' },
      });

      const result = await slackService.sendMessage(channel, text);

      expect(result).toBe(false);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          channel,
          text,
        },
        {
          headers: {
            Authorization: `Bearer ${mockBotToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should return false when axios throws an error', async () => {
      const channel = 'U1234567890';
      const text = 'Hello, world!';
      
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await slackService.sendMessage(channel, text);

      expect(result).toBe(false);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          channel,
          text,
        },
        {
          headers: {
            Authorization: `Bearer ${mockBotToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should handle empty message text', async () => {
      const channel = 'U1234567890';
      const text = '';
      
      mockedAxios.post.mockResolvedValue({
        data: { ok: true },
      });

      const result = await slackService.sendMessage(channel, text);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          channel,
          text: '',
        },
        {
          headers: {
            Authorization: `Bearer ${mockBotToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });
  });

  describe('sendTypingIndicator', () => {
    it('should send typing indicator successfully', async () => {
      const channel = 'U1234567890';
      
      mockedAxios.post.mockResolvedValue({
        data: { ok: true },
      });

      const result = await slackService.sendTypingIndicator(channel);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          channel,
          text: '...',
          unfurl_links: false,
          unfurl_media: false,
        },
        {
          headers: {
            Authorization: `Bearer ${mockBotToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should return false when Slack API returns error', async () => {
      const channel = 'U1234567890';
      
      mockedAxios.post.mockResolvedValue({
        data: { ok: false, error: 'invalid_channel' },
      });

      const result = await slackService.sendTypingIndicator(channel);

      expect(result).toBe(false);
    });

    it('should return false when axios throws an error', async () => {
      const channel = 'U1234567890';
      
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await slackService.sendTypingIndicator(channel);

      expect(result).toBe(false);
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { ok: true, user_id: 'U1234567890', team_id: 'T1234567890' },
      });

      const result = await slackService.validateToken();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/auth.test',
        {},
        {
          headers: {
            Authorization: `Bearer ${mockBotToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should return false for invalid token', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { ok: false, error: 'invalid_auth' },
      });

      const result = await slackService.validateToken();

      expect(result).toBe(false);
    });

    it('should return false when axios throws an error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await slackService.validateToken();

      expect(result).toBe(false);
    });

    it('should return false for expired token', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { ok: false, error: 'token_expired' },
      });

      const result = await slackService.validateToken();

      expect(result).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create instance with bot token', () => {
      const service = new SlackService('xoxb-custom-token');
      expect(service).toBeInstanceOf(SlackService);
    });

    it('should handle empty token', () => {
      const service = new SlackService('');
      expect(service).toBeInstanceOf(SlackService);
    });
  });
});
