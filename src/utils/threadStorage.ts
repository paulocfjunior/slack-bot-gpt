import fs from 'fs';
import path from 'path';

const STORAGE_FILE = 'user-threads.json';

/**
 * Storage utility for managing user-to-thread mapping in a local JSON file
 */
export class ThreadStorage {
  private storagePath: string;
  private data: Map<string, string>;

  constructor() {
    this.storagePath = path.join(process.cwd(), STORAGE_FILE);
    this.data = new Map();
    this.loadFromFile();
  }

  /**
   * Load thread mappings from the JSON file
   */
  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const fileContent = fs.readFileSync(this.storagePath, 'utf8');
        const jsonData = JSON.parse(fileContent);

        // Convert JSON object back to Map
        this.data = new Map(Object.entries(jsonData));
        console.log(
          `Loaded ${this.data.size} thread mappings from ${STORAGE_FILE}`,
        );
      } else {
        console.log(
          `No existing thread storage found. Creating new file: ${STORAGE_FILE}`,
        );
        this.saveToFile();
      }
    } catch (error) {
      console.error('Error loading thread storage:', error);
      // If file is corrupted, start with empty data
      this.data = new Map();
      this.saveToFile();
    }
  }

  /**
   * Save thread mappings to the JSON file
   */
  private saveToFile(): void {
    try {
      // Convert Map to JSON object
      const jsonData = Object.fromEntries(this.data);
      fs.writeFileSync(this.storagePath, JSON.stringify(jsonData, null, 2));
      console.log(`Saved ${this.data.size} thread mappings to ${STORAGE_FILE}`);
    } catch (error) {
      console.error('Error saving thread storage:', error);
    }
  }

  /**
   * Get thread ID for a user
   * @param userId - Slack user ID
   * @returns Thread ID if exists, undefined otherwise
   */
  get(userId: string): string | undefined {
    return this.data.get(userId);
  }

  /**
   * Set thread ID for a user
   * @param userId - Slack user ID
   * @param threadId - OpenAI thread ID
   */
  set(userId: string, threadId: string): void {
    this.data.set(userId, threadId);
    this.saveToFile();
  }

  /**
   * Check if a user has an existing thread
   * @param userId - Slack user ID
   * @returns true if user has a thread, false otherwise
   */
  has(userId: string): boolean {
    return this.data.has(userId);
  }

  /**
   * Get all stored mappings (for debugging)
   * @returns Object with user IDs as keys and thread IDs as values
   */
  getAll(): Record<string, string> {
    return Object.fromEntries(this.data);
  }

  /**
   * Remove a user's thread mapping
   * @param userId - Slack user ID
   */
  delete(userId: string): void {
    this.data.delete(userId);
    this.saveToFile();
  }

  /**
   * Clear all thread mappings
   */
  clear(): void {
    this.data.clear();
    this.saveToFile();
  }

  /**
   * Get the number of stored mappings
   * @returns Number of user-thread mappings
   */
  size(): number {
    return this.data.size;
  }
}
