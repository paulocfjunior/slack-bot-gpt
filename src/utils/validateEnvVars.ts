export function validateEnvVars() {
  const requiredEnvVars = [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'SLACK_BOT_OPENAI_API_KEY',
    'SLACK_BOT_OPENAI_ASSISTANT_ID',
    'SLACK_BOT_APP_ID',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    process.exit(1);
  }
}
