# WebSocket Server Deployment Guide

This guide provides instructions for deploying your WebSocket server to various free hosting platforms.

## Deployment Options

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

## Connecting Your Frontend to the WebSocket Server

After deploying your WebSocket server, you need to update your frontend to connect to the new WebSocket URL. Update your frontend code to use the secure WebSocket protocol (wss://) with the URL of your deployed server.

Example:
```javascript
const socket = io('wss://your-deployed-server-url');
```

## Environment Variables

Make sure to set the following environment variables on your hosting platform:

- `PORT`: The port your server will run on (default: 8080)
- `FRONTEND_URL`: The URL of your Netlify frontend (for CORS)
- Any database connection strings required by your application

## Troubleshooting

If you encounter CORS issues, make sure:

1. Your WebSocket server's CORS settings allow your frontend domain
2. You're using the secure WebSocket protocol (wss://) for HTTPS frontends
3. Your frontend is connecting to the correct WebSocket URL 