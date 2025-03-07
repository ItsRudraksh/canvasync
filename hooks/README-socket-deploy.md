# WebSocket Deployment Guide

This guide explains how to use the modified `use-socket-deploy.tsx` hook to connect your frontend to the deployed WebSocket server.

## Setup Instructions

### 1. Environment Variables

First, add the WebSocket server URL to your environment variables:

Create or update your `.env.local` file in the root of your project:

```
NEXT_PUBLIC_SOCKET_URL=https://your-deployed-socket-server.fly.dev
```

Replace `https://your-deployed-socket-server.fly.dev` with the actual URL of your deployed WebSocket server.

### 2. Update Your Application

#### Option 1: Replace the existing hook

If you want to completely switch to the deployed server:

1. Rename `use-socket-deploy.tsx` to `use-socket.tsx` (backup the original first)
2. Update your application to use the new hook

#### Option 2: Use both hooks conditionally

If you want to support both local development and production:

1. Keep both `use-socket.tsx` and `use-socket-deploy.tsx`
2. Create a conditional import in your components:

```tsx
// In your component
import { useSocket as useLocalSocket } from "@/hooks/use-socket";
import { useSocket as useDeployedSocket } from "@/hooks/use-socket-deploy";

// Use the appropriate hook based on environment
const useSocket = process.env.NEXT_PUBLIC_USE_DEPLOYED_SOCKET === "true" 
  ? useDeployedSocket 
  : useLocalSocket;

// Then use it in your component
const { socket, isConnected } = useSocket();
```

### 3. Update Your SocketProvider

In your application's main layout or provider component, update the SocketProvider import:

```tsx
// Before
import { SocketProvider } from "@/hooks/use-socket";

// After (if using Option 1)
import { SocketProvider } from "@/hooks/use-socket";

// After (if using Option 2)
import { SocketProvider as LocalSocketProvider } from "@/hooks/use-socket";
import { SocketProvider as DeployedSocketProvider } from "@/hooks/use-socket-deploy";

const SocketProvider = process.env.NEXT_PUBLIC_USE_DEPLOYED_SOCKET === "true"
  ? DeployedSocketProvider
  : LocalSocketProvider;
```

## Troubleshooting

If you encounter connection issues:

1. **CORS Errors**: Make sure your WebSocket server's CORS settings allow your frontend domain
2. **SSL/HTTPS Issues**: Ensure you're using the secure WebSocket protocol (wss://) for HTTPS frontends
3. **Connection Failures**: Check that your WebSocket server is running and accessible

The `use-socket-deploy.tsx` hook includes fallback mechanisms to handle connection issues, including:

- Automatic reconnection attempts
- Fallback to secure connections when needed
- Detailed error logging

## Development vs Production

The modified hook includes helper functions to determine the environment and select the appropriate WebSocket URL:

```tsx
// In your component
import { isDevelopment, getSocketUrl } from "@/hooks/use-socket-deploy";

console.log("Current environment:", isDevelopment() ? "Development" : "Production");
console.log("Socket URL:", getSocketUrl());
```

This makes it easy to use different WebSocket servers for development and production. 