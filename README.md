# WhatsApp Auto-Reply Service

Service untuk auto reply pesan WhatKonfigurasikan WAHA untuk mengirim webhook ke service ini:

```bash
curl -X POST "http://whatsapp.rajaprasetya.web.id/api/webhook" \
  -H "Content-Type: application/json" \
  -H "x-secret-token: YOUR_WAHA_API_KEY" \
  -d '{
    "url": "http://localhost:3006/webhook",
    "events": ["message"],
    "hmac": false,
    "retries": 3,
    "customHeaders": [
      {
        "name": "X-Secret-Token", 
        "value": "your_webhook_secret_here"
      }
    ]
  }'
```n, Hono, dan WAHA (WhatsApp HTTP API).

## Fitur

- ✅ Auto reply otomatis untuk pesan masuk
- ✅ Rate limiting per pengirim
- ✅ Whitelist nomor telepon (opsional)
- ✅ Delay konfigurabel sebelum membalas
- ✅ Webhook security dengan secret key
- ✅ Health check endpoint
- ✅ Manual send message API
- ✅ Logging komprehensif

## Prerequisites

- [Bun](https://bun.sh) v1.0 atau lebih baru (untuk development)
- [Docker](https://docker.com) (untuk deployment)
- [WAHA](https://waha.devlike.pro/) instance yang sudah berjalan
- WhatsApp Business/Personal account yang terhubung ke WAHA

## Setup

### Development Setup

#### 1. Clone dan Install Dependencies

```bash
cd whatsapp-autoreply
bun install
```

#### 2. Konfigurasi Environment

Copy file `.env.example` ke `.env` dan isi dengan konfigurasi Anda:

```bash
cp .env.example .env
```

Edit file `.env`:

```env
# WAHA API Configuration
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=your_waha_api_key_here
SESSION_NAME=default

# Server Configuration
PORT=8080

# Auto Reply Settings
AUTO_REPLY_ENABLED=true
REPLY_MESSAGE=Terima kasih atas pesan Anda! Kami akan segera merespons.

# Security
WEBHOOK_SECRET=your_webhook_secret_here

# Rate Limiting (messages per minute per sender)
RATE_LIMIT=10

# Allowed Numbers (comma separated, kosong untuk allow all)
ALLOWED_NUMBERS=62812345678,62887654321

# Reply Delay (in milliseconds)
REPLY_DELAY=2000
```

### 3. Setup WAHA Webhook

Konfigurasikan WAHA untuk mengirim webhook ke service ini:

```bash
curl -X POST "http://localhost:3000/api/webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WAHA_API_KEY" \
  -d '{
    "url": "http://localhost:8080/webhook",
    "events": ["message"],
    "hmac": false,
    "retries": 3,
    "customHeaders": [
      {
        "name": "x-webhook-secret", 
        "value": "your_webhook_secret_here"
      }
    ]
  }'
```

## Menjalankan Service

### Development Mode (dengan auto-reload)

```bash
bun run dev
```

### Production Mode

```bash
bun run start
```

### Build untuk Production

```bash
bun run build
bun dist/index.js
```

### Docker Deployment

#### 1. Build Docker Image

```bash
docker build -t whatsapp-autoreply:latest .
```

#### 2. Run Docker Container

```bash
docker run -d \
  --name whatsapp-autoreply \
  --restart unless-stopped \
  -p 3006:3006 \
  -e WAHA_API_URL="http://whatsapp.rajaprasetya.web.id" \
  -e WAHA_API_KEY="your_api_key_here" \
  -e SESSION_NAME="default" \
  -e AUTO_REPLY_ENABLED="true" \
  -e REPLY_MESSAGE="Terima kasih atas pesan Anda! Kami akan segera merespons." \
  -e WEBHOOK_SECRET="your_webhook_secret_here" \
  -e RATE_LIMIT="10" \
  -e REPLY_DELAY="2000" \
  -e ALLOWED_NUMBERS="" \
  whatsapp-autoreply:latest
```

#### 3. Check Container Status

```bash
# Check if container is running
docker ps

# View logs
docker logs -f whatsapp-autoreply

# Check health
curl http://localhost:3006/health
```

#### 4. Stop Container

```bash
docker stop whatsapp-autoreply
docker rm whatsapp-autoreply
```

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-08T10:30:00.000Z",
  "config": {
    "autoReplyEnabled": true,
    "sessionName": "default",
    "port": 8080
  }
}
```

### Webhook (untuk WAHA)
```
POST /webhook
```

Headers:
```
X-Secret-Token: your_webhook_secret_here
Content-Type: application/json
```

### Manual Send Message
```
POST /send
```

Body:
```json
{
  "chatId": "62812345678@c.us",
  "message": "Hello, this is a test message!"
}
```

### Get Configuration
```
GET /config
```

## Konfigurasi WAHA

Pastikan WAHA instance Anda sudah:

1. **Started session**: 
   ```bash
   curl -X POST "http://localhost:3000/api/sessions/start" \
     -H "X-Secret-Token: YOUR_API_KEY" \
     -d '{"name": "default"}'
   ```

2. **Connected WhatsApp**: Scan QR code melalui GET `/api/sessions/default/me`

3. **Set webhook** (seperti langkah setup di atas)

## Rate Limiting

Service ini mengimplementasikan rate limiting per pengirim:
- Default: 10 pesan per menit per pengirim
- Konfigurasi via `RATE_LIMIT` di `.env`
- Rate limit counter direset setiap menit

## Whitelist Numbers

Untuk membatasi auto-reply hanya untuk nomor tertentu:

```env
ALLOWED_NUMBERS=62812345678,62887654321,628123456789
```

Kosongkan untuk mengizinkan semua nomor.

## Logging

Service akan mencatat:
- Pesan masuk dan keluar
- Rate limit violations
- Error dan exceptions
- Webhook events

## Troubleshooting

### 1. Service tidak menerima webhook
- Pastikan WAHA webhook URL sudah benar
- Check firewall dan network connectivity
- Verify webhook secret header

### 2. Auto-reply tidak terkirim
- Check WAHA session status: `GET /api/sessions`
- Verify WAHA API key dan URL
- Check rate limiting logs
- Verify nomor ada di whitelist (jika dikonfigurasi)

### 3. TypeScript errors saat development
```bash
bun install @types/bun
```

## Contoh Webhook Payload dari WAHA

```json
{
  "event": "message",
  "session": "default",
  "payload": {
    "id": "msg_id_here",
    "timestamp": 1638360000,
    "from": "62812345678@c.us",
    "fromMe": false,
    "body": "Hello, this is a test message",
    "type": "chat",
    "chatId": "62812345678@c.us"
  }
}
```

## Security Notes

1. Gunakan HTTPS untuk webhook endpoint di production
2. Set webhook secret yang kuat
3. Implementasikan IP whitelisting jika diperlukan
4. Monitor logs untuk aktivitas mencurigakan
5. Rate limit API endpoints

## License

MIT License
