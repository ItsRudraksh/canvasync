# WebSocket Deployment Guide

This guide provides a complete solution for deploying your WebSocket server to a free hosting platform and connecting your Netlify frontend to it.

## Table of Contents

1. [Server Deployment Options](#server-deployment-options)
2. [Frontend Integration](#frontend-integration)
3. [Switching Between Local and Deployed Servers](#switching-between-local-and-deployed-servers)
4. [Troubleshooting](#troubleshooting)

## Server Deployment Options

We've prepared several options for deploying your WebSocket server for free:

### Option 1: Railway.app (Recommended)

Railway offers a free tier with $5 of free credits per month, which is enough for a small WebSocket server.

1. Create an account on [Railway.app](https://railway.app/)
2. Install the Railway CLI: `npm i -g @railway/cli`
3. Login to Railway: `railway login`
4. Navigate to the server directory: `cd server`
5. Initialize a new Railway project: `railway init`
6. Deploy your app: `railway up`

Railway will automatically detect the Dockerfile and deploy your application. The WebSocket server will be available at the URL provided by Railway.

### Option 2: Fly.io

Fly.io offers a generous free tier with 3 shared-cpu-1x 256mb VMs for free.

1. Create an account on [Fly.io](https://fly.io/)
2. Install the Flyctl CLI: Follow instructions at https://fly.io/docs/hands-on/install-flyctl/
3. Login to Fly.io: `flyctl auth login`
4. Navigate to the server directory: `cd server`
5. Launch your app: `flyctl launch`
6. Deploy your app: `flyctl deploy`

Your WebSocket server will be available at `wss://your-app-name.fly.dev`.

### Option 3: Render.com

Render offers a free tier for web services, but they will spin down after 15 minutes of inactivity.

1. Create an account on [Render.com](https://render.com/)
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the service:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Root Directory: `server`
5. Set environment variables:
   - `PORT`: 8080
   - `FRONTEND_URL`: Your Netlify frontend URL

Your WebSocket server will be available at the URL provided by Render.

## Frontend Integration

We've created several files to help you integrate your frontend with the deployed WebSocket server:

### 1. Modified Socket Hook

The `hooks/use-socket-deploy.tsx` file contains a modified version of your socket hook that works with the deployed WebSocket server. It includes:

- Automatic fallback to secure connections
- Better error handling
- Environment-specific configuration

### 2. Conditional Socket Provider

The `components/socket-provider.tsx` file provides a unified interface for both local and deployed socket servers. It automatically selects the appropriate provider based on environment variables.

### 3. Environment Configuration

The `.env.socket-deploy` file contains example environment variables for configuring your WebSocket connection.

### Setup Instructions

1. Copy the environment variables to your `.env.local` file:

```bash
cp .env.socket-deploy .env.local
```

2. Update the `NEXT_PUBLIC_SOCKET_URL` in `.env.local` with your actual deployed WebSocket server URL.

3. Update your application to use the conditional socket provider:

```tsx
// In your layout.tsx or app.tsx
import { SocketProvider } from "@/components/socket-provider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
```

4. Use the unified socket hook in your components:

```tsx
// In your component
"use client";
import { useSocket } from "@/components/socket-provider";

export default function MyComponent() {
  const { socket, isConnected } = useSocket();
  
  // Use the socket as before
  // ...
}
```

## Switching Between Local and Deployed Servers

We've created a script to help you switch between local and deployed WebSocket servers:

```bash
# Install dotenv package if you haven't already
npm install dotenv --save-dev

# Switch to local server
node scripts/toggle-socket-server.js local

# Switch to deployed server
node scripts/toggle-socket-server.js deploy

# Toggle between local and deployed
node scripts/toggle-socket-server.js
```

This script updates your `.env.local` file with the appropriate configuration.

## Troubleshooting

### CORS Issues

If you encounter CORS errors, make sure your WebSocket server's CORS settings allow your frontend domain:

```javascript
// In server/socket-server-deploy.js
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*", // Set this to your Netlify URL
    methods: ["GET", "POST"],
    credentials: true
  },
});
```

### SSL/HTTPS Issues

If your Netlify site is using HTTPS (which it should be), you need to use a secure WebSocket connection (wss://). The modified socket hook includes fallback mechanisms to handle this.

### Connection Failures

If you can't connect to your WebSocket server:

1. Check that your server is running and accessible
2. Verify that you're using the correct URL
3. Check the browser console for error messages
4. Try accessing the server directly in your browser (you should see "WebSocket server is running")

### Deployment Issues

If you encounter issues deploying your WebSocket server:

1. Check the logs from your hosting provider
2. Verify that your Dockerfile is correct
3. Make sure your environment variables are set correctly
4. Check that your database connection (if any) is working

## Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Railway Documentation](https://docs.railway.app/)
- [Fly.io Documentation](https://fly.io/docs/)
- [Render Documentation](https://render.com/docs) 