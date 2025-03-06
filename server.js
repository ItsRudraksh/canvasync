const express = require('express');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize Prisma
const prisma = new PrismaClient();

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
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

  // Helper function to broadcast updated counts
  function broadcastUserCounts(whiteboardId) {
    const counts = getUserCounts(whiteboardId);
    io.to(whiteboardId).emit("user-counts-update", counts);
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

    // Handle shape updates
    socket.on("shape-update", ({ whiteboardId, instanceId, shape, shapes }) => {
      if (whiteboardShapes.has(whiteboardId)) {
        whiteboardShapes.set(whiteboardId, shapes);
      }
      socket.to(whiteboardId).emit("shape-updated", { instanceId, shape, shapes });
    });

    socket.on("shape-update-end", ({ whiteboardId, instanceId, shapes }) => {
      if (whiteboardShapes.has(whiteboardId)) {
        whiteboardShapes.set(whiteboardId, shapes);
      }
      socket.to(whiteboardId).emit("shape-update-ended", { instanceId, shapes });
    });

    // Handle other whiteboard events
    socket.on("eraser-highlight", ({ whiteboardId, instanceId, shapesToErase }) => {
      socket.to(whiteboardId).emit("eraser-highlighted", { instanceId, shapesToErase });
    });

    socket.on("undo-redo", ({ whiteboardId, instanceId, shapes }) => {
      if (whiteboardShapes.has(whiteboardId)) {
        whiteboardShapes.set(whiteboardId, shapes);
      }
      socket.to(whiteboardId).emit("undo-redo-update", { instanceId, shapes });
    });

    socket.on("clear-canvas", ({ whiteboardId, instanceId }) => {
      if (whiteboardShapes.has(whiteboardId)) {
        whiteboardShapes.set(whiteboardId, []);
      }
      socket.to(whiteboardId).emit("canvas-cleared", { instanceId });
    });

    socket.on("cursor-move", ({ whiteboardId, instanceId, x, y, user }) => {
      socket.to(whiteboardId).emit("cursor-update", { instanceId, x, y, user });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      whiteboards.forEach((whiteboard, whiteboardId) => {
        let userRemoved = false;
        let removedInstanceId = null;
        let removedUserData = null;

        whiteboard.forEach((userData, instanceId) => {
          if (userData.socketId === socket.id) {
            whiteboard.delete(instanceId);
            userRemoved = true;
            removedInstanceId = instanceId;
            removedUserData = userData;
          }
        });

        if (userRemoved) {
          const counts = getUserCounts(whiteboardId);
          io.to(whiteboardId).emit("user-left", { instanceId: removedInstanceId, counts });

          if (whiteboard.size === 0) {
            whiteboards.delete(whiteboardId);
            whiteboardShapes.delete(whiteboardId);
          }
        }
      });
    });

    // Handle explicit leave
    socket.on("leave-whiteboard", ({ whiteboardId, instanceId }) => {
      const whiteboard = whiteboards.get(whiteboardId);
      if (whiteboard) {
        const userData = whiteboard.get(instanceId);
        whiteboard.delete(instanceId);

        const counts = getUserCounts(whiteboardId);
        socket.to(whiteboardId).emit("user-left", { instanceId, counts });

        if (whiteboard.size === 0) {
          whiteboards.delete(whiteboardId);
          whiteboardShapes.delete(whiteboardId);
        }
      }
      socket.leave(whiteboardId);
    });
  });

  // Handle Next.js requests
  expressApp.all('*', (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 