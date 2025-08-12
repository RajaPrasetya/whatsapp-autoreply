import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { WebhookPayload } from './types';
import { WAHAService } from './waha-service';
import { loadConfig } from './config';

// Load configuration
const config = loadConfig();
console.log('Configuration loaded:', {
  ...config,
  wahaApiKey: '***hidden***',
  webhookSecret: '***hidden***'
});

// Initialize services
const wahaService = new WAHAService(config);

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    config: {
      autoReplyEnabled: config.autoReplyEnabled,
      sessionName: config.sessionName,
      port: config.port
    }
  });
});

// Webhook endpoint for WAHA
app.post('/webhook', async (c) => {
  try {
    const body = await c.req.json() as WebhookPayload;
    
    console.log('Received webhook:', JSON.stringify(body, null, 2));

    // Verify webhook secret if configured
    if (config.webhookSecret) {
      const providedSecret = c.req.header('x-webhook-secret') || c.req.header('authorization')?.replace('Bearer ', '');
      if (providedSecret !== config.webhookSecret) {
        console.log('Invalid webhook secret');
        return c.json({ error: 'Unauthorized' }, 401);
      }
    }

    // Process message events
    if (body.event === 'message' && body.payload) {
      const message = body.payload;
      
      // Skip messages sent by us (fromMe = true)
      if (message.fromMe) {
        console.log('Skipping message from self');
        return c.json({ status: 'ignored', reason: 'fromMe' });
      }

      // Skip non-text messages
      if (message.type !== 'chat') {
        console.log(`Skipping non-text message type: ${message.type}`);
        return c.json({ status: 'ignored', reason: 'non-text' });
      }

      // Process the message
      await wahaService.processMessage(
        message.chatId,
        message.from,
        message.body
      );

      return c.json({ 
        status: 'processed',
        messageId: message.id,
        chatId: message.chatId,
        from: message.from
      });
    }

    // Handle other events
    console.log(`Received event: ${body.event}`);
    return c.json({ status: 'received', event: body.event });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Manual send message endpoint (for testing)
app.post('/send', async (c) => {
  try {
    const { chatId, message } = await c.req.json();
    
    if (!chatId || !message) {
      return c.json({ error: 'chatId and message are required' }, 400);
    }

    const success = await wahaService.sendMessage(chatId, message);
    
    return c.json({ 
      success,
      chatId,
      message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending manual message:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get configuration endpoint
app.get('/config', (c) => {
  return c.json({
    autoReplyEnabled: config.autoReplyEnabled,
    sessionName: config.sessionName,
    replyMessage: config.replyMessage,
    rateLimit: config.rateLimit,
    replyDelay: config.replyDelay,
    allowedNumbers: config.allowedNumbers.length > 0 ? '[configured]' : '[all allowed]'
  });
});

// Start server
console.log(`🚀 Starting WhatsApp Auto-Reply Service...`);

const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`🚀 WhatsApp Auto-Reply Service running on port ${server.port}`);
console.log(`📊 Health check: http://localhost:${server.port}/health`);
console.log(`🪝 Webhook endpoint: http://localhost:${server.port}/webhook`);
console.log(`⚙️  Configuration: http://localhost:${server.port}/config`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.stop();
  process.exit(0);
});
