import type { Config, WAHASendMessageRequest } from './types';
import { logWithTimestamp, logErrorWithTimestamp } from './utils';

export class WAHAService {
  private config: Config;
  private rateLimitMap: Map<string, number[]> = new Map();

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Send message via WAHA API
   */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    try {
      const payload: WAHASendMessageRequest = {
        chatId,
        text,
        session: this.config.sessionName
      };

      const response = await fetch(`${this.config.wahaApiUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret-Token': this.config.webhookSecret
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        logErrorWithTimestamp(`Failed to send message: ${response.status} ${response.statusText}`);
        return false;
      }

      const result = await response.json();
      logWithTimestamp(`Message sent successfully to ${chatId}:`, result);
      return true;
    } catch (error) {
      logErrorWithTimestamp('Error sending message:', error);
      return false;
    }
  }

  /**
   * Check if sender is within rate limit
   */
  isWithinRateLimit(senderId: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Get existing timestamps for this sender
    let timestamps = this.rateLimitMap.get(senderId) || [];
    
    // Filter out timestamps older than 1 minute
    timestamps = timestamps.filter(timestamp => timestamp > oneMinuteAgo);
    
    // Update the map
    this.rateLimitMap.set(senderId, timestamps);
    
    return timestamps.length < this.config.rateLimit;
  }

  /**
   * Add timestamp to rate limit tracking
   */
  addToRateLimit(senderId: string): void {
    const now = Date.now();
    const timestamps = this.rateLimitMap.get(senderId) || [];
    timestamps.push(now);
    this.rateLimitMap.set(senderId, timestamps);
  }

  /**
   * Check if number is allowed (if allowlist is configured)
   */
  isNumberAllowed(phoneNumber: string): boolean {
    if (this.config.allowedNumbers.length === 0) {
      return true; // Allow all if no specific numbers configured
    }
    
    // Remove formatting and check if number is in allowed list
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    return this.config.allowedNumbers.some(allowed => {
      const cleanAllowed = allowed.replace(/\D/g, '');
      return cleanNumber.includes(cleanAllowed) || cleanAllowed.includes(cleanNumber);
    });
  }

  /**
   * Process incoming message and send auto-reply if needed
   */
  async processMessage(chatId: string, senderId: string, messageBody: string): Promise<void> {
    // Skip if auto-reply is disabled
    if (!this.config.autoReplyEnabled) {
      logWithTimestamp('Auto-reply is disabled');
      return;
    }

    // Check if number is allowed
    if (!this.isNumberAllowed(senderId)) {
      logWithTimestamp(`Number ${senderId} is not in allowed list`);
      return;
    }

    // Check rate limit
    if (!this.isWithinRateLimit(senderId)) {
      logWithTimestamp(`Rate limit exceeded for ${senderId}`);
      return;
    }

    // Add delay before sending reply
    if (this.config.replyDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.replyDelay));
    }

    // Send auto-reply
    const success = await this.sendMessage(chatId, this.config.replyMessage);
    
    if (success) {
      // Update rate limit tracking
      this.addToRateLimit(senderId);
      logWithTimestamp(`Auto-reply sent to ${senderId} in chat ${chatId}`);
    }
  }
}
