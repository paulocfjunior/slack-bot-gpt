import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { handleSendMessage } from './manualMessage';
import { SlackService } from '../services/slackService';

// Mock SlackService
jest.mock('../services/slackService');
const MockedSlackService = jest.mocked(SlackService);

describe('handleSendMessage', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: any;
  let mockSlackService: jest.Mocked<SlackService>;

  beforeEach(() => {
    // Reset environment
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    
    // Create mock SlackService instance
    mockSlackService = {
      lookupUserByUsername: jest.fn(),
      openDirectMessage: jest.fn(),
      sendMessage: jest.fn(),
      sendTypingIndicator: jest.fn(),
      validateToken: jest.fn(),
    } as any;

    // Mock constructor to return our mock instance
    MockedSlackService.mockImplementation(() => mockSlackService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Request validation', () => {
    it('should return 400 when request body is missing', async () => {
      mockRequest = {
        body: undefined,
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request body is required',
      });
    });

    it('should return 400 when username is missing', async () => {
      mockRequest = {
        body: {
          message: 'Hello world',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required and must be a string',
      });
    });

    it('should return 400 when message is missing', async () => {
      mockRequest = {
        body: {
          username: 'testuser',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Message is required and must be a string',
      });
    });

    it('should return 400 when username is empty', async () => {
      mockRequest = {
        body: {
          username: '',
          message: 'Hello world',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required and must be a string',
      });
    });

    it('should return 400 when message is empty', async () => {
      mockRequest = {
        body: {
          username: 'testuser',
          message: '',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Message is required and must be a string',
      });
    });

    it('should handle username with @ symbol', async () => {
      mockRequest = {
        body: {
          username: '@testuser',
          message: 'Hello world',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMessage.mockResolvedValue(true);

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockSlackService.lookupUserByUsername).toHaveBeenCalledWith('testuser');
    });
  });

  describe('User lookup', () => {
    it('should return 404 when user is not found', async () => {
      mockRequest = {
        body: {
          username: 'nonexistentuser',
          message: 'Hello world',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

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
        body: {
          username: 'testuser',
          message: 'Hello world',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

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
        body: {
          username: 'testuser',
          message: 'Hello world',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMessage.mockResolvedValue(false);

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

  describe('Successful message sending', () => {
    it('should return 200 with success response when message is sent', async () => {
      mockRequest = {
        body: {
          username: 'testuser',
          message: 'Hello world',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMessage.mockResolvedValue(true);

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Message sent successfully to testuser',
        userId: 'U1234567890',
        channelId: 'D1234567890',
      });
    });

    it('should call SlackService methods in correct order', async () => {
      mockRequest = {
        body: {
          username: 'testuser',
          message: 'Hello world',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockSlackService.lookupUserByUsername.mockResolvedValue('U1234567890');
      mockSlackService.openDirectMessage.mockResolvedValue('D1234567890');
      mockSlackService.sendMessage.mockResolvedValue(true);

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockSlackService.lookupUserByUsername).toHaveBeenCalledWith('testuser');
      expect(mockSlackService.openDirectMessage).toHaveBeenCalledWith('U1234567890');
      expect(mockSlackService.sendMessage).toHaveBeenCalledWith('D1234567890', 'Hello world');
    });
  });

  describe('Error handling', () => {
    it('should return 500 when an unexpected error occurs', async () => {
      mockRequest = {
        body: {
          username: 'testuser',
          message: 'Hello world',
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockSlackService.lookupUserByUsername.mockRejectedValue(new Error('Unexpected error'));

      await handleSendMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });
  });
}); 