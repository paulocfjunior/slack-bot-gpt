import axios from 'axios';

/**
 * Service for interacting with Slack API
 */
export class SlackService {
  private readonly botToken: string;
  private readonly baseURL = 'https://slack.com/api';

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  /**
   * Sends a message to a user via Slack API
   * @param channel - The channel ID (user ID for DMs)
   * @param text - The message text to send
   * @returns Promise<boolean> - Success status
   */
  async sendMessage(channel: string, text: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat.postMessage`,
        {
          channel: channel,
          text: text
        },
        {
          headers: {
            'Authorization': `Bearer ${this.botToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.ok) {
        console.error('Slack API error:', response.data.error);
        return false;
      }

      console.log(`Message sent to ${channel}: ${text}`);
      return true;
    } catch (error) {
      console.error('Error sending Slack message:', error);
      return false;
    }
  }

  /**
   * Sends a typing indicator to a channel
   * @param channel - The channel ID
   * @returns Promise<boolean> - Success status
   */
  async sendTypingIndicator(channel: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat.postMessage`,
        {
          channel: channel,
          text: '...',
          unfurl_links: false,
          unfurl_media: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.botToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.ok;
    } catch (error) {
      console.error('Error sending typing indicator:', error);
      return false;
    }
  }

  /**
   * Validates that the bot token is valid
   * @returns Promise<boolean> - Whether the token is valid
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseURL}/auth.test`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.botToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.ok;
    } catch (error) {
      console.error('Error validating Slack token:', error);
      return false;
    }
  }
} 