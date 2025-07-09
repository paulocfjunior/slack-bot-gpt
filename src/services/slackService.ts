import { markdownToBlocks } from '@tryfabric/mack';
import axios from 'axios';

interface SlackMember {
  id: string;
  name: string;
  is_bot: boolean;
  updated: number;
  is_app_user: boolean;
  team_id: string;
  deleted: boolean;
  color: string;
  is_email_confirmed: boolean;
  real_name: string;
  tz: string;
  tz_label: string;
  tz_offset: number;
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  who_can_share_contact_card: string;
  profile?: {
    real_name: string;
    display_name: string;
    avatar_hash: string;
    real_name_normalized: string;
    display_name_normalized: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
    image_1024: string;
    image_original: string;
    is_custom_image: boolean;
    first_name: string;
    last_name: string;
    team: string;
    title: string;
    phone: string;
    skype: string;
    status_text: string;
    status_text_canonical: string;
    status_emoji: string;
    status_emoji_display_info: string[];
    status_expiration: number;
  };
}

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
   * Looks up a user by username and returns their user ID
   * @param username - The username to look up (without @ symbol)
   * @returns Promise<string | null> - User ID if found, null otherwise
   */
  async lookupUserByUsername(username: string): Promise<string | null> {
    try {
      // Remove @ symbol if present
      const cleanUsername = username.startsWith('@')
        ? username.slice(1)
        : username;

      const response = await axios.post(
        `${this.baseURL}/users.lookupByEmail`,
        {
          email: `${cleanUsername}@slack.com`, // This is a fallback approach
        },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.ok && response.data.user) {
        return response.data.user.id;
      }

      // If email lookup fails, try users.list to find by display name
      const usersResponse = await axios.get(`${this.baseURL}/users.list`, {
        headers: {
          Authorization: `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (usersResponse.data.ok && usersResponse.data.members) {
        const user = usersResponse.data.members.find(
          (member: SlackMember) =>
            member.name === cleanUsername ||
            member.profile?.display_name === cleanUsername ||
            member.profile?.real_name === cleanUsername,
        );

        if (user) {
          return user.id;
        }
      }

      console.error('User not found:', username);
      return null;
    } catch (error) {
      console.error('Error looking up user by username:', error);
      return null;
    }
  }

  /**
   * Opens a direct message channel with a user
   * @param userId - The user ID to open DM with
   * @returns Promise<string | null> - Channel ID if successful, null otherwise
   */
  async openDirectMessage(userId: string): Promise<string | null> {
    try {
      const response = await axios.post(
        `${this.baseURL}/conversations.open`,
        {
          users: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.ok && response.data.channel) {
        return response.data.channel.id;
      }

      console.error('Failed to open DM channel:', response.data.error);
      return null;
    } catch (error) {
      console.error('Error opening direct message channel:', error);
      return null;
    }
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
          channel,
          text,
        },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        console.error(
          'Slack API error on chat.postMessage:',
          response.data.error,
        );
        return false;
      }

      console.log(`Message sent to ${channel}: ${text}`);
      return true;
    } catch (error) {
      console.error('Error sending Slack message:', error);
      return false;
    }
  }

  async sendMarkdownMessage(
    channel: string,
    markdown: string,
  ): Promise<boolean> {
    try {
      const blocks = await markdownToBlocks(markdown);
      console.log('blocks', blocks);
      const response = await axios.post(
        `${this.baseURL}/chat.postMessage`,
        {
          channel,
          blocks,
        },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        console.error(
          'Slack API error on chat.postMessage (markdown):',
          response.data.error,
        );
        return false;
      }

      console.log(`Message sent to ${channel} (markdown): ${markdown}`);
      return true;
    } catch (error) {
      console.error('Error sending Slack message (markdown):', error);
      return false;
    }
  }

  /**
   * Deletes a message on a channel via Slack API
   * @param channel - The channel ID (user ID for DMs)
   * @param ts - The timestamp of the message to delete
   * @returns Promise<boolean> - Success status
   */
  async deleteMessage(channel: string, ts: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat.delete`,
        {
          channel,
          ts,
        },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        console.error('Slack API error on chat.delete:', response.data.error);
        return false;
      }

      console.log(`Message deleted on ${channel} at ${ts}`);
      return true;
    } catch (error) {
      console.error('Error deleting Slack message:', error);
      return false;
    }
  }

  /**
   * Updates a message on a channel via Slack API
   * @param channel - The channel ID (user ID for DMs)
   * @param text - The message text to send
   * @param ts - The timestamp of the message to update
   * @returns Promise<boolean> - Success status
   */
  async updateMessage(
    channel: string,
    text: string,
    ts: string,
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat.update`,
        {
          channel,
          text,
          ts,
          as_user: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        console.error('Slack API error on chat.update:', response.data.error, {
          ts,
        });
        return false;
      }

      console.log(`Message updated on ${channel} at ${ts}: ${text}`);
      return true;
    } catch (error) {
      console.error('Error updating Slack message:', error);
      return false;
    }
  }

  /**
   * Sends a typing indicator to a channel
   * @param channel - The channel ID
   * @param userId - The user ID
   * @returns Promise<string | null> - Message timestamp if successful, null otherwise
   */
  async sendTypingIndicator(channel: string): Promise<string | null> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat.postMessage`,
        {
          channel,
          text: 'Thinking...',
        },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.ts || null;
    } catch (error) {
      console.error('Error sending typing indicator:', error);
      return null;
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
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.ok;
    } catch (error) {
      console.error('Error validating Slack token:', error);
      return false;
    }
  }
}
