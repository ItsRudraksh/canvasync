const { createServer } = require("http")
const { Server } = require("socket.io")
const express = require("express")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()
const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

// Store active whiteboards and their users
const whiteboards = new Map()
// Store whiteboard shapes for persistence during the session
const whiteboardShapes = new Map()

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Join whiteboard room
  socket.on("join-whiteboard", ({ whiteboardId, instanceId, user }) => {
    console.log(`User ${user.name} (${instanceId}) joined whiteboard ${whiteboardId}`)

    socket.join(whiteboardId)

    // Initialize whiteboard room if it doesn't exist
    if (!whiteboards.has(whiteboardId)) {
      whiteboards.set(whiteboardId, new Map())
    }

    // Initialize whiteboard shapes if it doesn't exist
    if (!whiteboardShapes.has(whiteboardId)) {
      whiteboardShapes.set(whiteboardId, [])
    }

    // Add user to whiteboard
    const whiteboard = whiteboards.get(whiteboardId)
    whiteboard.set(instanceId, {
      socketId: socket.id,
      user,
    })

    // Notify others in the room
    socket.to(whiteboardId).emit("user-joined", {
      instanceId,
      user,
    })
  })

  // Handle drawing events
  socket.on("draw-start", ({ whiteboardId, instanceId, shape }) => {
    console.log(`Draw start in whiteboard ${whiteboardId} by ${instanceId}`)
    socket.to(whiteboardId).emit("draw-started", {
      instanceId,
      shape,
    })
  })

  socket.on("draw-progress", ({ whiteboardId, instanceId, shape }) => {
    socket.to(whiteboardId).emit("draw-progressed", {
      instanceId,
      shape,
    })
  })

  socket.on("draw-end", ({ whiteboardId, instanceId, shape }) => {
    console.log(`Draw end in whiteboard ${whiteboardId} by ${instanceId}`)
    // Add shape to whiteboard shapes
    if (whiteboardShapes.has(whiteboardId)) {
      const shapes = whiteboardShapes.get(whiteboardId)
      shapes.push(shape)
    }
    
    socket.to(whiteboardId).emit("draw-ended", {
      instanceId,
      shape,
    })
  })

  // Handle clear canvas
  socket.on("clear-canvas", ({ whiteboardId, instanceId }) => {
    console.log(`Canvas cleared in whiteboard ${whiteboardId} by ${instanceId}`)
    // Clear whiteboard shapes
    if (whiteboardShapes.has(whiteboardId)) {
      whiteboardShapes.set(whiteboardId, [])
    }
    
    socket.to(whiteboardId).emit("canvas-cleared", {
      instanceId,
    })
  })

  // Handle cursor movement
  socket.on("cursor-move", ({ whiteboardId, instanceId, x, y, user }) => {
    socket.to(whiteboardId).emit("cursor-update", {
      instanceId,
      x,
      y,
      user,
    })
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`)

    // Find and remove user from all whiteboards
    whiteboards.forEach((whiteboard, whiteboardId) => {
      whiteboard.forEach((userData, instanceId) => {
        if (userData.socketId === socket.id) {
          whiteboard.delete(instanceId)

          // Notify others in the room
          io.to(whiteboardId).emit("user-left", {
            instanceId,
          })

          // Clean up empty whiteboards
          if (whiteboard.size === 0) {
            whiteboards.delete(whiteboardId)
          }
        }
      })
    })
  })

  // Handle explicit leave
  socket.on("leave-whiteboard", ({ whiteboardId, instanceId }) => {
    const whiteboard = whiteboards.get(whiteboardId)
    if (whiteboard) {
      whiteboard.delete(instanceId)

      // Notify others in the room
      socket.to(whiteboardId).emit("user-left", {
        instanceId,
      })

      // Clean up empty whiteboards
      if (whiteboard.size === 0) {
        whiteboards.delete(whiteboardId)
      }
    }

    socket.leave(whiteboardId)
  })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`)
})

