import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import crypto from 'crypto';

import { validateTimestamp, verifySlackSignature } from './slackVerifier';

// Mock crypto module
jest.mock('crypto');

describe('slackVerifier', () => {
  describe('validateTimestamp', () => {
    it('should return true for recent timestamps', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(validateTimestamp(now.toString())).toBe(true);
    });

    it('should return false for timestamps older than 5 minutes', () => {
      const oldTime = Math.floor(Date.now() / 1000) - 6 * 60; // 6 minutes ago
      expect(validateTimestamp(oldTime.toString())).toBe(false);
    });

    it('should return false for timestamps more than 5 minutes in the future', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 6 * 60; // 6 minutes in future
      expect(validateTimestamp(futureTime.toString())).toBe(false);
    });

    it('should return true for timestamps within 5 minutes', () => {
      const recentTime = Math.floor(Date.now() / 1000) - 2 * 60; // 2 minutes ago
      expect(validateTimestamp(recentTime.toString())).toBe(true);
    });
  });

  describe('verifySlackSignature', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return false for old timestamps', () => {
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 6 * 60).toString();
      const body = Buffer.from('test body');
      const signature = 'v0=test_signature';
      const signingSecret = 'test_secret';

      const result = verifySlackSignature(
        body,
        signature,
        oldTimestamp,
        signingSecret,
      );

      expect(result).toBe(false);
    });

    it('should return false for invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = Buffer.from('test body');
      const signature = 'v0=invalid_signature';
      const signingSecret = 'test_secret';

      // Mock crypto to return different hash
      jest.mocked(crypto.createHmac).mockReturnValue({
        update: jest.fn().mockReturnValue({
          digest: jest.fn().mockReturnValue('correct_hash'),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      jest.mocked(crypto.timingSafeEqual).mockReturnValue(false);

      const result = verifySlackSignature(
        body,
        signature,
        timestamp,
        signingSecret,
      );

      expect(result).toBe(false);
    });

    it('should return true for valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = Buffer.from('test body');
      const signature = 'v0=correct_signature';
      const signingSecret = 'test_secret';

      // Mock crypto to return matching hash
      jest.mocked(crypto.createHmac).mockReturnValue({
        update: jest.fn().mockReturnValue({
          digest: jest.fn().mockReturnValue('correct_hash'),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      jest.mocked(crypto.timingSafeEqual).mockReturnValue(true);

      const result = verifySlackSignature(
        body,
        signature,
        timestamp,
        signingSecret,
      );

      expect(result).toBe(true);
    });

    it('should return false when crypto operations throw an error', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = Buffer.from('test body');
      const signature = 'v0=test_signature';
      const signingSecret = 'test_secret';

      jest.mocked(crypto.createHmac).mockImplementation(() => {
        throw new Error('Crypto error');
      });

      const result = verifySlackSignature(
        body,
        signature,
        timestamp,
        signingSecret,
      );

      expect(result).toBe(false);
    });

    it('should handle empty body', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = Buffer.from('');
      const signature = 'v0=test_signature';
      const signingSecret = 'test_secret';

      // Mock crypto to return matching hash
      jest.mocked(crypto.createHmac).mockReturnValue({
        update: jest.fn().mockReturnValue({
          digest: jest.fn().mockReturnValue('correct_hash'),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      jest.mocked(crypto.timingSafeEqual).mockReturnValue(true);

      const result = verifySlackSignature(
        body,
        signature,
        timestamp,
        signingSecret,
      );

      expect(result).toBe(true);
    });

    it('should handle complex JSON body', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const jsonBody = JSON.stringify({
        event: { type: 'message', text: 'Hello!' },
      });
      const body = Buffer.from(jsonBody);
      const signature = 'v0=test_signature';
      const signingSecret = 'test_secret';

      // Mock crypto to return matching hash
      jest.mocked(crypto.createHmac).mockReturnValue({
        update: jest.fn().mockReturnValue({
          digest: jest.fn().mockReturnValue('correct_hash'),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      jest.mocked(crypto.timingSafeEqual).mockReturnValue(true);

      const result = verifySlackSignature(
        body,
        signature,
        timestamp,
        signingSecret,
      );

      expect(result).toBe(true);
    });
  });
});
