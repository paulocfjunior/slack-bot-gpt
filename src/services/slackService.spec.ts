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
          text: 'Thinking...',
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

  describe('lookupUserByUsername', () => {
    it('should find user by username via email lookup', async () => {
      const username = 'testuser';
      
      mockedAxios.post.mockResolvedValue({
        data: { ok: true, user: { id: 'U1234567890', name: 'testuser' } },
      });

      const result = await slackService.lookupUserByUsername(username);

      expect(result).toBe('U1234567890');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/users.lookupByEmail',
        {
          email: 'testuser@slack.com',
        },
        {
          headers: {
            Authorization: `Bearer ${mockBotToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should find user by username via users.list when email lookup fails', async () => {
      const username = 'testuser';
      
      // Email lookup fails
      mockedAxios.post.mockResolvedValueOnce({
        data: { ok: false, error: 'users_not_found' },
      });

      // Users list succeeds
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ok: true,
          members: [
            { id: 'U1234567890', name: 'testuser', profile: { display_name: 'Test User' } },
          ],
        },
      });

      const result = await slackService.lookupUserByUsername(username);

      expect(result).toBe('U1234567890');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://slack.com/api/users.list',
        {
          headers: {
            Authorization: `Bearer ${mockBotToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should handle username with @ symbol', async () => {
      const username = '@testuser';
      
      mockedAxios.post.mockResolvedValue({
        data: { ok: true, user: { id: 'U1234567890', name: 'testuser' } },
      });

      const result = await slackService.lookupUserByUsername(username);

      expect(result).toBe('U1234567890');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/users.lookupByEmail',
        {
          email: 'testuser@slack.com',
        },
        {
          headers: {
            Authorization: `Bearer ${mockBotToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should return null when user is not found', async () => {
      const username = 'nonexistentuser';
      
      // Email lookup fails
      mockedAxios.post.mockResolvedValueOnce({
        data: { ok: false, error: 'users_not_found' },
      });

      // Users list succeeds but user not found
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ok: true,
          members: [
            { id: 'U1234567890', name: 'otheruser', profile: { display_name: 'Other User' } },
          ],
        },
      });

      const result = await slackService.lookupUserByUsername(username);

      expect(result).toBe(null);
    });

    it('should return null when axios throws an error', async () => {
      const username = 'testuser';
      
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await slackService.lookupUserByUsername(username);

      expect(result).toBe(null);
    });
  });

  describe('openDirectMessage', () => {
    it('should open DM channel successfully', async () => {
      const userId = 'U1234567890';
      
      mockedAxios.post.mockResolvedValue({
        data: { ok: true, channel: { id: 'D1234567890' } },
      });

      const result = await slackService.openDirectMessage(userId);

      expect(result).toBe('D1234567890');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/conversations.open',
        {
          users: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${mockBotToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should return null when DM channel cannot be opened', async () => {
      const userId = 'U1234567890';
      
      mockedAxios.post.mockResolvedValue({
        data: { ok: false, error: 'user_not_found' },
      });

      const result = await slackService.openDirectMessage(userId);

      expect(result).toBe(null);
    });

    it('should return null when axios throws an error', async () => {
      const userId = 'U1234567890';
      
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await slackService.openDirectMessage(userId);

      expect(result).toBe(null);
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
