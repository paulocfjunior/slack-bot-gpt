import { markdownToBlocks } from '@tryfabric/mack';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

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
  private readonly cacheFilePath: string;
  private userCache: Map<string, string> = new Map();
  private cacheLastUpdated: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(botToken: string) {
    this.botToken = botToken;
    this.cacheFilePath = path.join(process.cwd(), 'slack-users-cache.json');
    this.loadUserCache();
  }

  /**
   * Loads user cache from JSON file
   */
  private loadUserCache(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const cacheData = JSON.parse(
          fs.readFileSync(this.cacheFilePath, 'utf8'),
        );
        this.userCache = new Map(cacheData.users || []);
        this.cacheLastUpdated = cacheData.lastUpdated || 0;
        console.log(`Loaded ${this.userCache.size} users from cache`);
      }
    } catch (error) {
      console.error('Error loading user cache:', error);
      this.userCache = new Map();
    }
  }

  /**
   * Saves user cache to JSON file
   */
  private saveUserCache(): void {
    try {
      const cacheData = {
        users: Array.from(this.userCache.entries()),
        lastUpdated: Date.now(),
      };
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cacheData, null, 2));
      console.log(`Saved ${this.userCache.size} users to cache`);
    } catch (error) {
      console.error('Error saving user cache:', error);
    }
  }

  getUserCache(): { users: [string, string][]; lastUpdated: number } {
    return {
      users: Array.from(this.userCache.entries()),
      lastUpdated: this.cacheLastUpdated,
    };
  }

  /**
   * Checks if cache is stale and needs refresh
   */
  private isCacheStale(): boolean {
    return Date.now() - this.cacheLastUpdated > this.CACHE_DURATION;
  }

  /**
   * Refreshes the user cache by fetching all users from Slack
   */
  async refreshUserCache(): Promise<void> {
    try {
      console.log('Refreshing user cache...');
      const response = await axios.get(`${this.baseURL}/users.list`, {
        headers: {
          Authorization: `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.ok && response.data.members) {
        this.userCache.clear();

        response.data.members.forEach((member: SlackMember) => {
          // Store by username
          if (member.name) {
            this.userCache.set(member.name, member.id);
          }

          // Store by display name
          if (member.profile?.display_name) {
            this.userCache.set(member.profile.display_name, member.id);
          }

          // Store by real name
          if (member.profile?.real_name) {
            this.userCache.set(member.profile.real_name, member.id);
          }
        });

        this.cacheLastUpdated = Date.now();
        this.saveUserCache();
        console.log(`Cache refreshed with ${this.userCache.size} user entries`);
      }
    } catch (error) {
      console.error('Error refreshing user cache:', error);
    }
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

      // Check if cache is stale and refresh if needed
      if (this.isCacheStale()) {
        await this.refreshUserCache();
      }

      // Look up in cache first
      const cachedUserId = this.userCache.get(cleanUsername);
      if (cachedUserId) {
        console.log(`User found in cache: ${cleanUsername} -> ${cachedUserId}`);
        return cachedUserId;
      }

      await this.refreshUserCache();
      const refreshedUserId = this.userCache.get(cleanUsername);
      if (refreshedUserId) {
        console.log(
          `User found after cache refresh: ${cleanUsername} -> ${refreshedUserId}`,
        );
        return refreshedUserId;
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
      const blocks = (await markdownToBlocks(markdown)).map(block => {
        if (block.type === 'image' && block.title === undefined) {
          delete block.title;
        }
        return block;
      });

      console.log('blocks========', JSON.stringify(blocks, null, 2));

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendBlocks(channel: string, blocks: any[]): Promise<boolean> {
    try {
      console.log('blocks========', JSON.stringify(blocks, null, 2));

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
          'Slack API error on chat.postMessage (blocks):',
          response.data.error,
        );
        return false;
      }

      console.log(
        `Message sent to ${channel} (blocks): ${JSON.stringify(blocks, null, 2)}`,
      );
      return true;
    } catch (error) {
      console.error('Error sending Slack message (blocks):', error);
      return false;
    }
  }

  async uploadImage(
    imageBuffer: Buffer,
    filename: string,
    channel?: string,
  ): Promise<[string, string] | false> {
    try {
      const form = new FormData();
      form.append('filename', filename);
      form.append('length', imageBuffer.length.toString());

      if (channel) {
        form.append('channel', channel);
      }

      // 1. Get upload URL and file_id
      const { data: presign } = await axios.post(
        `${this.baseURL}/files.getUploadURLExternal`,
        form,
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const { upload_url, file_id } = presign;

      // 2. Upload image to upload_url
      const uploadForm = new FormData();
      uploadForm.append('file', imageBuffer, {
        filename,
        contentType: 'image/png',
      });

      await axios.post(upload_url, uploadForm, {
        headers: uploadForm.getHeaders(),
        maxBodyLength: Infinity,
      });

      // 3. Complete the upload and share the image
      const response = await axios.post(
        `${this.baseURL}/files.completeUploadExternal`,
        {
          files: [{ id: file_id }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('response', response.data);

      if (!response.data.ok) {
        console.error(
          'Slack API error on files.completeUploadExternal:',
          response.data.error,
        );
        return false;
      }

      return [response.data.files[0].url_private, file_id];
    } catch (error) {
      console.error('Error sending Slack image:', error);
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

  /**
   * Verifies if a file is properly uploaded and accessible
   * @param fileId - The file ID to verify
   * @returns Promise<boolean> - Whether the file is accessible
   */
  async verifyImageUpload(fileId: string): Promise<boolean> {
    try {
      // Use files.info API to check file status
      const response = await axios.get(`${this.baseURL}/files.info`, {
        headers: {
          Authorization: `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          file: fileId,
        },
      });

      if (!response.data.ok) {
        console.error('Slack API error on files.info:', response.data.error);
        return false;
      }

      const file = response.data.file;

      // Check if file exists and is not deleted
      if (!file || file.deleted) {
        console.error('File not found or deleted:', fileId);
        return false;
      }

      // Check if file is accessible (has url_private)
      if (!file.url_private) {
        console.error('File not accessible:', fileId);
        return false;
      }

      if (!file.mimetype?.startsWith('image/')) {
        console.warn('File is still processing:', fileId);
        return false;
      }

      console.log(`File verified successfully: ${fileId}`);
      return true;
    } catch (error) {
      console.error('Error verifying file upload:', error);
      return false;
    }
  }

  /**
   * Waits for a file to be uploaded and accessible with retries
   * @param fileUrl - The private URL of the file to verify
   * @param maxRetries - Maximum number of retry attempts (default: 5)
   * @param retryDelay - Delay between retries in milliseconds (default: 1000)
   * @returns Promise<boolean> - Whether the file is accessible
   */
  async waitForFileUpload(
    fileId: string,
    maxRetries: number = 10,
    retryDelay: number = 500,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `Verifying file upload (attempt ${attempt}/${maxRetries})...`,
      );

      const isUploaded = await this.verifyImageUpload(fileId);
      if (isUploaded) {
        console.log('File upload verified successfully');
        return true;
      }

      if (attempt < maxRetries) {
        console.log(`File not ready yet, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    console.error(
      `File upload verification failed after ${maxRetries} attempts`,
    );
    return false;
  }
}
