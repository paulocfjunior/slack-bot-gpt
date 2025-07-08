import axios from 'axios';

function handleError(error: unknown) {
  if (axios.isAxiosError(error)) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
  } else {
    console.error('Unexpected Error:', error);
  }
}

// Types for OpenAI API responses
interface Thread {
  id: string;
  object: string;
  created_at: number;
  metadata: Record<string, unknown>;
}

interface Message {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  role: 'user' | 'assistant';
  content: Array<{
    type: string;
    text: {
      value: string;
      annotations: unknown[];
    };
  }>;
}

interface Run {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  assistant_id: string;
  status:
    | 'queued'
    | 'in_progress'
    | 'requires_action'
    | 'cancelling'
    | 'cancelled'
    | 'failed'
    | 'completed'
    | 'expired';
  started_at?: number;
  expires_at?: number;
  completed_at?: number;
  last_error?: unknown;
  required_action?: unknown;
}

/**
 * Service for interacting with OpenAI Assistant API
 */
export class OpenAIService {
  private readonly apiKey: string;
  private readonly assistantId: string;
  private readonly baseURL = 'https://api.openai.com/v1';

  constructor(apiKey: string, assistantId: string) {
    this.apiKey = apiKey;
    this.assistantId = assistantId;
  }

  /**
   * Creates a new thread for a user
   * @returns Promise<Thread> - The created thread
   */
  async createThread(): Promise<Thread> {
    try {
      const response = await axios.post(
        `${this.baseURL}/threads`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );

      return response.data;
    } catch (error) {
      handleError(error);
      throw new Error('Failed to create OpenAI thread');
    }
  }

  /**
   * Adds a message to a thread
   * @param threadId - The thread ID
   * @param content - The message content
   * @returns Promise<Message> - The created message
   */
  async addMessageToThread(
    threadId: string,
    content: string,
  ): Promise<Message> {
    try {
      const response = await axios.post(
        `${this.baseURL}/threads/${threadId}/messages`,
        {
          role: 'user',
          content,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );

      return response.data;
    } catch (error) {
      handleError(error);
      throw new Error('Failed to add message to thread');
    }
  }

  /**
   * Creates and starts a run on a thread
   * @param threadId - The thread ID
   * @returns Promise<Run> - The created run
   */
  async createRun(threadId: string): Promise<Run> {
    try {
      const response = await axios.post(
        `${this.baseURL}/threads/${threadId}/runs`,
        {
          assistant_id: this.assistantId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );

      return response.data;
    } catch (error) {
      handleError(error);
      throw new Error('Failed to create OpenAI run');
    }
  }

  /**
   * Retrieves the status of a run
   * @param threadId - The thread ID
   * @param runId - The run ID
   * @returns Promise<Run> - The run status
   */
  async getRunStatus(threadId: string, runId: string): Promise<Run> {
    try {
      const response = await axios.get(
        `${this.baseURL}/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );

      return response.data;
    } catch (error) {
      handleError(error);
      throw new Error('Failed to get run status');
    }
  }

  /**
   * Waits for a run to complete and returns the result
   * @param threadId - The thread ID
   * @param runId - The run ID
   * @returns Promise<Run> - The completed run
   */
  async waitForRunCompletion(threadId: string, runId: string): Promise<Run> {
    let run: Run;

    do {
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));

      run = await this.getRunStatus(threadId, runId);

      if (
        run.status === 'failed' ||
        run.status === 'cancelled' ||
        run.status === 'expired'
      ) {
        throw new Error(`Run failed with status: ${run.status}`);
      }
    } while (run.status !== 'completed');

    return run;
  }

  /**
   * Retrieves messages from a thread
   * @param threadId - The thread ID
   * @returns Promise<Message[]> - Array of messages
   */
  async getThreadMessages(threadId: string): Promise<Message[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/threads/${threadId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        },
      );

      return response.data.data;
    } catch (error) {
      handleError(error);
      throw new Error('Failed to get thread messages');
    }
  }

  /**
   * Gets the latest assistant message from a thread
   * @param threadId - The thread ID
   * @returns Promise<string> - The assistant's response text
   */
  async getLatestAssistantMessage(threadId: string): Promise<string> {
    try {
      const messages = await this.getThreadMessages(threadId);

      // Find the latest assistant message
      const assistantMessage = messages.find(msg => msg.role === 'assistant');

      if (!assistantMessage) {
        throw new Error('No assistant message found in thread');
      }

      // Extract text content from the message
      const textContent = assistantMessage.content.find(
        content => content.type === 'text',
      );

      if (!textContent) {
        throw new Error('No text content found in assistant message');
      }

      return textContent.text.value;
    } catch (error) {
      handleError(error);
      throw new Error('Failed to get assistant response');
    }
  }
}
