const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const port = process.env.PORT || 3000;

// Initialize Express
const expressApp = express();
const server = createServer(expressApp);

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://your-vercel-app.vercel.app",
    methods: ["GET", "POST"],
  },
});

// Store active whiteboards and their users
const whiteboards = new Map();
// Store whiteboard shapes for persistence during the session
const whiteboardShapes = new Map();

// Helper function to get user counts
function getUserCounts(whiteboardId) {
  const whiteboard = whiteboards.get(whiteboardId);
  if (!whiteboard) return { collaborators: 0, viewers: 0 };

  let collaborators = 0;
  let viewers = 0;

  whiteboard.forEach((userData) => {
    if (userData.canEdit) {
      collaborators++;
    } else {
      viewers++;
    }
  });

  return { collaborators, viewers };
}

// Socket.IO event handlers
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join whiteboard room
  socket.on("join-whiteboard", async ({ whiteboardId, instanceId, user, canEdit }) => {
    console.log(`User ${user.name} (${instanceId}) joined whiteboard ${whiteboardId} with ${canEdit ? 'edit' : 'view'} access`);

    socket.join(whiteboardId);

    if (!whiteboards.has(whiteboardId)) {
      whiteboards.set(whiteboardId, new Map());
    }

    if (!whiteboardShapes.has(whiteboardId)) {
      whiteboardShapes.set(whiteboardId, []);
    }

    const whiteboard = whiteboards.get(whiteboardId);

    whiteboard.forEach((userData, existingInstanceId) => {
      if (userData.user.id === user.id) {
        whiteboard.delete(existingInstanceId);
      }
    });

    whiteboard.set(instanceId, {
      socketId: socket.id,
      user,
      canEdit,
    });

    const counts = getUserCounts(whiteboardId);
    socket.emit("user-counts-update", counts);
    socket.to(whiteboardId).emit("user-joined", {
      instanceId,
      user,
      canEdit,
      counts,
    });
  });

  // Handle drawing events
  socket.on("draw-start", ({ whiteboardId, instanceId, shape }) => {
    socket.to(whiteboardId).emit("draw-started", { instanceId, shape });
  });

  socket.on("draw-progress", ({ whiteboardId, instanceId, shape }) => {
    socket.to(whiteboardId).emit("draw-progressed", { instanceId, shape });
  });

  socket.on("draw-end", ({ whiteboardId, instanceId, shape }) => {
    if (whiteboardShapes.has(whiteboardId)) {
      const shapes = whiteboardShapes.get(whiteboardId);
      shapes.push(shape);
    }
    socket.to(whiteboardId).emit("draw-ended", { instanceId, shape });
  });

  // Handle other events (reusing the same event handlers from your original server.js)
  // ... Add all other event handlers here ...

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    // ... Handle disconnect logic ...
  });
});

// Basic health check endpoint
expressApp.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`> Socket.IO server ready on port ${port}`);
}); 