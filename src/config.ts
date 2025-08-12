import type { Config } from './types';

export function loadConfig(): Config {
  const requiredEnvVars = ['WAHA_API_URL', 'WAHA_API_KEY'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const allowedNumbers = process.env.ALLOWED_NUMBERS 
    ? process.env.ALLOWED_NUMBERS.split(',').map((num: string) => num.trim()).filter(Boolean)
    : [];

  return {
    wahaApiUrl: process.env.WAHA_API_URL!,
    wahaApiKey: process.env.WAHA_API_KEY!,
    sessionName: process.env.SESSION_NAME || 'default',
    port: parseInt(process.env.PORT || '8080'),
    autoReplyEnabled: process.env.AUTO_REPLY_ENABLED?.toLowerCase() === 'true',
    replyMessage: process.env.REPLY_MESSAGE || 'Terima kasih atas pesan Anda! Kami akan segera merespons.',
    webhookSecret: process.env.WEBHOOK_SECRET || '',
    rateLimit: parseInt(process.env.RATE_LIMIT || '10'),
    allowedNumbers,
    replyDelay: parseInt(process.env.REPLY_DELAY || '2000')
  };
}
