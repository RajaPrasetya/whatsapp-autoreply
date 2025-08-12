export interface Config {
  wahaApiUrl: string;
  wahaApiKey: string;
  sessionName: string;
  port: number;
  autoReplyEnabled: boolean;
  replyMessage: string;
  webhookSecret: string;
  rateLimit: number;
  allowedNumbers: string[];
  replyDelay: number;
}

export interface WAHAMessage {
  id: string;
  timestamp: number;
  from: string;
  fromMe: boolean;
  body: string;
  type: string;
  chatId: string;
  participant?: string;
  quotedMsg?: {
    id: string;
    body: string;
    from: string;
  };
}

export interface WebhookPayload {
  event: string;
  session: string;
  payload: WAHAMessage;
}

export interface WAHASendMessageRequest {
  chatId: string;
  text: string;
  session: string;
}
