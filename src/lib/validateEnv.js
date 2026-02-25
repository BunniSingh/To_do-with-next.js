/**
 * Validates that required environment variables are set
 * Call this at application startup
 */

export function validateEnv() {
  const requiredEnvVars = [
    'MONGODB_URI',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];

  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((envVar) => {
      console.error(`  - ${envVar}`);
    });
    console.error('\n📝 Current process.env:', Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('NODE')));
    console.error('\n📝 Copy .env.example to .env and fill in the values.\n');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate NEXTAUTH_SECRET strength in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXTAUTH_SECRET.length < 32) {
      throw new Error('NEXTAUTH_SECRET must be at least 32 characters in production');
    }
    if (process.env.NEXTAUTH_SECRET === 'your-secret-key-here-change-in-production') {
      throw new Error('NEXTAUTH_SECRET must be changed from the default value in production');
    }
  }

  console.log('✓ Environment variables validated:', {
    MONGODB_URI: process.env.MONGODB_URI ? '✓ Set' : '✗ Missing',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}
