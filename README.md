# Slack Bot with OpenAI Assistant API

[![CI](https://github.com/paulocfjunior/slack-bot-gpt/workflows/CI/badge.svg)](https://github.com/paulocfjunior/slack-bot-gpt/actions/workflows/ci.yml)
[![Security](https://github.com/paulocfjunior/slack-bot-gpt/workflows/Security/badge.svg)](https://github.com/paulocfjunior/slack-bot-gpt/actions/workflows/security.yml)

A Node.js TypeScript backend that creates a Slack bot capable of receiving direct messages from users, forwarding them to OpenAI Assistant API, and responding with the AI's reply.

## Features

- ✅ Express.js web framework with TypeScript
- ✅ ES module syntax
- ✅ Slack event handling with signature verification
- ✅ OpenAI Assistant API integration (Threads + Runs)
- ✅ File-based user-to-thread mapping persistence
- ✅ Direct message processing
- ✅ Comprehensive error handling
- ✅ Health check endpoint
- ✅ Development debug endpoints
- ✅ Comprehensive test suite with Jest
- ✅ Code quality tools (ESLint, Prettier)
- ✅ TypeScript compilation and type checking

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

Copy the example environment file and configure it with your credentials:

```bash
cp .env.example .env
```

Then edit the `.env` file with your actual values:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_BOT_OPENAI_API_KEY=sk-your-openai-api-key
SLACK_BOT_OPENAI_ASSISTANT_ID=asst-your-assistant-id
SLACK_BOT_APP_ID=your-slack-app-id
PORT=3000
```

**Note**: For testing, you can also copy `.env.test.example` to `.env.test` to use mock values.

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
2. Note the Assistant ID for the `SLACK_BOT_OPENAI_ASSISTANT_ID` environment variable

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

### Code Quality

```bash
# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Run all CI checks locally
npm run ci:check
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Using ngrok for Local Development

```bash
# Install ngrok if not already installed
npm install -g ngrok

# Start your server
npm run dev

# In another terminal, expose your local server
npm run ngrok
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

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### GET `/debug/threads` (Development Only)
Debug endpoint to view current thread mappings. Only available in non-production environments.

**Response:**
```json
{
  "threadCount": 5,
  "threads": {
    "U1234567890": "thread_abc123",
    "U0987654321": "thread_def456"
  }
}
```

## How It Works

1. **Message Reception**: When a user sends a DM to the bot, Slack sends an event to `/slack/events`
2. **Signature Verification**: The request is verified using Slack's signing secret
3. **Thread Management**: The system creates or retrieves an OpenAI thread for the user, persisting the mapping in `user-threads.json`
4. **Message Processing**: The user's message is added to the OpenAI thread
5. **AI Processing**: A run is created and monitored until completion
6. **Response**: The AI's response is sent back to the user via Slack API

## Project Structure

```
src/
├── index.ts              # Main server entry point
├── routes/
│   ├── slackEvents.ts    # Slack events endpoint handler
│   ├── slackEvents.spec.ts # Tests for Slack events
│   ├── manualMessage.ts  # Manual message sending endpoint
│   └── manualMessage.spec.ts # Tests for manual messages
├── services/
│   ├── openaiService.ts  # OpenAI Assistant API integration
│   ├── openaiService.spec.ts # Tests for OpenAI service
│   ├── slackService.ts   # Slack API integration
│   └── slackService.spec.ts # Tests for Slack service
└── utils/
    ├── slackVerifier.ts  # Slack signature verification
    ├── slackVerifier.spec.ts # Tests for Slack verifier
    ├── threadStorage.ts  # File-based thread storage
    └── threadStorage.spec.ts # Tests for thread storage
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
- Production environment restrictions on debug endpoints

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: All services and utilities have corresponding test files
- **Integration Tests**: Endpoint testing with proper mocking
- **Coverage Reports**: Detailed coverage information available
- **CI Ready**: Test configuration suitable for continuous integration

Run tests with coverage to see detailed metrics:

```bash
npm run test:coverage
```

## Continuous Integration

This project uses GitHub Actions for automated testing and quality checks:

### Workflows

- **CI** (`ci.yml`): Runs on every push and pull request
  - TypeScript compilation check
  - ESLint code quality checks
  - Prettier formatting validation
  - Jest test suite execution
  - Coverage reporting to Codecov

- **Security** (`security.yml`): Weekly security audits
  - npm audit for vulnerability scanning
  - Dependency outdated checks

- **Dependabot** (`dependabot.yml`): Automated dependency updates
  - Runs additional checks on Dependabot PRs
  - Enables auto-merge for safe updates

- **Deploy** (`deploy.yml`): Production deployment (template)
  - Runs tests and builds before deployment
  - Includes examples for various deployment platforms

### Setup

1. **Codecov Integration** (Optional):
   - Add `CODECOV_TOKEN` secret to your GitHub repository
   - Get your token from [Codecov](https://codecov.io)

2. **Dependabot** (Optional):
   - Dependabot is configured to create weekly PRs for dependency updates
   - Updates are grouped and labeled automatically

3. **Deployment** (Optional):
   - Uncomment and configure deployment steps in `deploy.yml`
   - Add necessary secrets for your deployment platform

## Troubleshooting

### Common Issues

1. **"Missing required headers"** - Ensure your Slack app is properly configured
2. **"Invalid signature"** - Check your `SLACK_SIGNING_SECRET` environment variable
3. **"Request timestamp is too old"** - Check system clock synchronization
4. **OpenAI API errors** - Verify your API key and Assistant ID
5. **"Missing required environment variables"** - Ensure all required env vars are set

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=* npm run dev
```

### Manual Message Testing

Use the included script to test sending messages:

```bash
npm run send-message "username" "Your test message"
```

## License

ISC 
