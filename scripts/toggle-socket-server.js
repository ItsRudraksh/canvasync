/**
 * Toggle Socket Server Script
 * 
 * This script helps you switch between local and deployed WebSocket servers.
 * 
 * Usage:
 * node scripts/toggle-socket-server.js [local|deploy]
 * 
 * If no argument is provided, it will toggle between local and deployed.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Path to the .env.local file
const envPath = path.join(__dirname, '..', '.env.local');

// Check if .env.local exists, if not create it
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, '# WebSocket Server Configuration\n');
}

// Load current environment variables
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Get the current setting or default to false
const currentSetting = envConfig.NEXT_PUBLIC_USE_DEPLOYED_SOCKET === 'true';

// Get the command line argument
const arg = process.argv[2];

// Determine the new setting
let newSetting;
if (arg === 'local') {
  newSetting = false;
} else if (arg === 'deploy') {
  newSetting = true;
} else {
  // Toggle if no specific argument
  newSetting = !currentSetting;
}

// Update the environment variable
envConfig.NEXT_PUBLIC_USE_DEPLOYED_SOCKET = newSetting.toString();

// Make sure we have a socket URL
if (!envConfig.NEXT_PUBLIC_SOCKET_URL) {
  if (newSetting) {
    envConfig.NEXT_PUBLIC_SOCKET_URL = 'https://your-deployed-socket-server.fly.dev';
  } else {
    envConfig.NEXT_PUBLIC_SOCKET_URL = 'http://localhost:3001';
  }
}

// Convert the config object back to a string
const newEnv = Object.entries(envConfig)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

// Write the updated config back to the .env.local file
fs.writeFileSync(envPath, newEnv);

console.log(`WebSocket server set to: ${newSetting ? 'DEPLOYED' : 'LOCAL'}`);
console.log(`Socket URL: ${envConfig.NEXT_PUBLIC_SOCKET_URL}`);
console.log('Restart your Next.js server for changes to take effect.'); 