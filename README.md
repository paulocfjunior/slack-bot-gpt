# Slack Bot with OpenAI Assistant API

A Node.js TypeScript backend that creates a Slack bot capable of receiving direct messages from users, forwarding them to OpenAI Assistant API, and responding with the AI's reply.

## Features

- ✅ Express.js web framework with TypeScript
- ✅ ES module syntax
- ✅ Slack event handling with signature verification
- ✅ OpenAI Assistant API integration (Threads + Runs)
- ✅ In-memory user-to-thread mapping
- ✅ Direct message processing
- ✅ Comprehensive error handling
- ✅ Health check endpoint

## Prerequisites

- Node.js 20+ 
- npm or yarn
- ngrok (for local development)
- Slack App with bot token and signing secret
- OpenAI API key and Assistant ID

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ASSISTANT_ID=asst-your-assistant-id
PORT=3000
```

### 3. Slack App Configuration

1. Create a new Slack App at https://api.slack.com/apps
2. Add the following bot token scopes:
   - `chat:write` - Send messages
   - `im:read` - Read direct messages
   - `im:write` - Send direct messages

3. Subscribe to bot events:
   - `message.im` - Direct messages to the bot

4. Set the Request URL to your ngrok URL + `/slack/events`

### 4. OpenAI Assistant Setup

1. Create an Assistant in OpenAI Playground
2. Note the Assistant ID for the `OPENAI_ASSISTANT_ID` environment variable

## Development

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

### Using ngrok for Local Development

```bash
# Install ngrok if not already installed
npm install -g ngrok

# Start your server
npm run dev

# In another terminal, expose your local server
ngrok http 3000
```

Use the ngrok URL (e.g., `https://abc123.ngrok.io`) as your Slack App's Request URL.

## API Endpoints

### POST `/slack/events`
Handles Slack events and URL verification challenges.

**Headers Required:**
- `x-slack-signature` - Slack request signature
- `x-slack-request-timestamp` - Request timestamp

**Event Types Handled:**
- `url_verification` - Slack URL verification challenge
- `event_callback` with `message.im` - Direct messages to the bot

### POST `/api/send-message`
Manually send a message to a user via the Slack bot.

**Request Body:**
```json
{
  "username": "username",
  "message": "Your message here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully to username",
  "userId": "U1234567890",
  "channelId": "D1234567890"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description"
}
```

### GET `/health`
Health check endpoint returning server status and uptime.

## How It Works

1. **Message Reception**: When a user sends a DM to the bot, Slack sends an event to `/slack/events`
2. **Signature Verification**: The request is verified using Slack's signing secret
3. **Thread Management**: The system creates or retrieves an OpenAI thread for the user
4. **Message Processing**: The user's message is added to the OpenAI thread
5. **AI Processing**: A run is created and monitored until completion
6. **Response**: The AI's response is sent back to the user via Slack API

## Project Structure

```
src/
├── index.ts              # Main server entry point
├── routes/
│   ├── slackEvents.ts    # Slack events endpoint handler
│   └── manualMessage.ts  # Manual message sending endpoint
├── services/
│   ├── openaiService.ts  # OpenAI Assistant API integration
│   └── slackService.ts   # Slack API integration
└── utils/
    └── slackVerifier.ts  # Slack signature verification
```

## Error Handling

The application includes comprehensive error handling:

- Slack signature verification failures
- OpenAI API errors
- Network timeouts
- Invalid request formats
- Missing environment variables

All errors are logged and appropriate responses are sent to users.

## Security Features

- Slack request signature verification
- Request timestamp validation (5-minute window)
- Environment variable validation
- Raw body parsing for signature verification

## Troubleshooting

### Common Issues

1. **"Missing required headers"** - Ensure your Slack app is properly configured
2. **"Invalid signature"** - Check your `SLACK_SIGNING_SECRET` environment variable
3. **"Request timestamp is too old"** - Check system clock synchronization
4. **OpenAI API errors** - Verify your API key and Assistant ID

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=* npm run dev
```

## License

ISC 