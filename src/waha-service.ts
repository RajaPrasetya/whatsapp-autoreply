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
          'X-Api-Key': this.config.wahaApiKey
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
   * Send seen status for message
   */
  async sendSeen(chatId: string): Promise<boolean> {
    try {
      const payload = {
        chatId,
        session: this.config.sessionName
      };

      const response = await fetch(`${this.config.wahaApiUrl}/api/sendSeen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.wahaApiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        logErrorWithTimestamp(`Failed to send seen: ${response.status} ${response.statusText}`);
        return false;
      }

      logWithTimestamp(`Seen status sent for ${chatId}`);
      return true;
    } catch (error) {
      logErrorWithTimestamp('Error sending seen:', error);
      return false;
    }
  }

  /**
   * Start typing indicator
   */
  async startTyping(chatId: string): Promise<boolean> {
    try {
      const payload = {
        chatId,
        session: this.config.sessionName
      };

      const response = await fetch(`${this.config.wahaApiUrl}/api/startTyping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.wahaApiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        logErrorWithTimestamp(`Failed to start typing: ${response.status} ${response.statusText}`);
        return false;
      }

      logWithTimestamp(`Started typing for ${chatId}`);
      return true;
    } catch (error) {
      logErrorWithTimestamp('Error starting typing:', error);
      return false;
    }
  }

  /**
   * Stop typing indicator
   */
  async stopTyping(chatId: string): Promise<boolean> {
    try {
      const payload = {
        chatId,
        session: this.config.sessionName
      };

      const response = await fetch(`${this.config.wahaApiUrl}/api/stopTyping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.wahaApiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        logErrorWithTimestamp(`Failed to stop typing: ${response.status} ${response.statusText}`);
        return false;
      }

      logWithTimestamp(`Stopped typing for ${chatId}`);
      return true;
    } catch (error) {
      logErrorWithTimestamp('Error stopping typing:', error);
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
   * Process incoming message and send auto-reply following WhatsApp best practices
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

    try {
      // Step 1: Send seen to indicate message was read
      logWithTimestamp(`Processing message from ${senderId}: "${messageBody}"`);
      await this.sendSeen(chatId);
      
      // Small delay after seen
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Start typing indicator
      await this.startTyping(chatId);
      
      // Step 3: Wait for random interval (simulate human typing time)
      const typingDelay = Math.random() * (this.config.replyDelay - 1000) + 1000; // Random between 1s to replyDelay
      await new Promise(resolve => setTimeout(resolve, typingDelay));

      // Step 4: Stop typing indicator
      await this.stopTyping(chatId);
      
      // Small delay after stopping typing
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 5: Send the actual message
      const success = await this.sendMessage(chatId, this.config.replyMessage);
      
      if (success) {
        // Update rate limit tracking
        this.addToRateLimit(senderId);
        logWithTimestamp(`Auto-reply sequence completed for ${senderId} in chat ${chatId}`);
      }
    } catch (error) {
      logErrorWithTimestamp(`Error in processMessage for ${senderId}:`, error);
    }
  }
}
