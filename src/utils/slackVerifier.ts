import crypto from 'crypto';

/**
 * Verifies Slack request signature to ensure requests come from Slack
 * @param body - Raw request body as buffer
 * @param signature - x-slack-signature header value
 * @param timestamp - x-slack-request-timestamp header value
 * @param signingSecret - Slack app signing secret
 * @returns boolean indicating if signature is valid
 */
export const verifySlackSignature = (
  body: Buffer,
  signature: string,
  timestamp: string,
  signingSecret: string,
): boolean => {
  try {
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
    if (parseInt(timestamp) < fiveMinutesAgo) {
      return false; // Prevent replay attacks
    }

    // Create the signature base string
    const baseString = `v0:${timestamp}:${body.toString()}`;

    // Create the expected signature
    const expectedSignature = `v0=${crypto
      .createHmac('sha256', signingSecret)
      .update(baseString)
      .digest('hex')}`;

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  } catch (error) {
    console.error('Error verifying Slack signature:', error);
    return false;
  }
};

/**
 * Validates that the request timestamp is not too old (within 5 minutes)
 * @param timestamp - x-slack-request-timestamp header value
 * @returns boolean indicating if timestamp is valid
 */
export const validateTimestamp = (timestamp: string): boolean => {
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;

  return Math.abs(currentTime - requestTime) < fiveMinutes;
};
