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

// Helper function to get user counts
function getUserCounts(whiteboardId) {
  const whiteboard = whiteboards.get(whiteboardId)
  if (!whiteboard) return { collaborators: 0, viewers: 0 }

  let collaborators = 0
  let viewers = 0

  whiteboard.forEach((userData) => {
    // If user has edit access (owner or collaborator), count as collaborator
    if (userData.canEdit) {
      collaborators++
    }
    // If user doesn't have edit access, count as viewer
    else {
      viewers++
    }
  })

  return { collaborators, viewers }
}

// Helper function to broadcast updated counts to all users in a whiteboard
function broadcastUserCounts(whiteboardId) {
  const counts = getUserCounts(whiteboardId)
  io.to(whiteboardId).emit("user-counts-update", counts)
}

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Join whiteboard room
  socket.on("join-whiteboard", async ({ whiteboardId, instanceId, user, canEdit }) => {
    console.log(`User ${user.name} (${instanceId}) joined whiteboard ${whiteboardId} with ${canEdit ? 'edit' : 'view'} access`)

    socket.join(whiteboardId)

    // Initialize whiteboard room if it doesn't exist
    if (!whiteboards.has(whiteboardId)) {
      whiteboards.set(whiteboardId, new Map())
    }

    // Initialize whiteboard shapes if it doesn't exist
    if (!whiteboardShapes.has(whiteboardId)) {
      whiteboardShapes.set(whiteboardId, [])
    }

    const whiteboard = whiteboards.get(whiteboardId)

    // Remove any existing connections for this instance/user
    whiteboard.forEach((userData, existingInstanceId) => {
      if (userData.user.id === user.id) {
        whiteboard.delete(existingInstanceId)
      }
    })

    // Add user to whiteboard
    whiteboard.set(instanceId, {
      socketId: socket.id,
      user,
      canEdit,
    })

    // Get updated counts
    const counts = getUserCounts(whiteboardId)

    // Send initial counts to the joining user
    socket.emit("user-counts-update", counts)

    // Notify others in the room
    socket.to(whiteboardId).emit("user-joined", {
      instanceId,
      user,
      canEdit,
      counts,
    })

    console.log(`Current counts for whiteboard ${whiteboardId}:`, counts)
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

  // Handle shape updates (dragging and resizing)
  socket.on("shape-update", ({ whiteboardId, instanceId, shape, shapes }) => {
    console.log(`Shape update in whiteboard ${whiteboardId} by ${instanceId}`)

    // Update the whiteboard shapes
    if (whiteboardShapes.has(whiteboardId)) {
      whiteboardShapes.set(whiteboardId, shapes)
    }

    socket.to(whiteboardId).emit("shape-updated", {
      instanceId,
      shape,
      shapes,
    })
  })

  socket.on("shape-update-end", ({ whiteboardId, instanceId, shapes }) => {
    console.log(`Shape update ended in whiteboard ${whiteboardId} by ${instanceId}`)

    // Update the whiteboard shapes
    if (whiteboardShapes.has(whiteboardId)) {
      whiteboardShapes.set(whiteboardId, shapes)
    }

    socket.to(whiteboardId).emit("shape-update-ended", {
      instanceId,
      shapes,
    })
  })

  // Handle eraser highlighting
  socket.on("eraser-highlight", ({ whiteboardId, instanceId, shapesToErase }) => {
    console.log(`Eraser highlight in whiteboard ${whiteboardId} by ${instanceId}, highlighting ${shapesToErase.length} shapes`)

    socket.to(whiteboardId).emit("eraser-highlighted", {
      instanceId,
      shapesToErase,
    })
  })

  // Handle undo/redo events
  socket.on("undo-redo", ({ whiteboardId, instanceId, shapes }) => {
    console.log(`Undo/redo in whiteboard ${whiteboardId} by ${instanceId}`)

    // Update the whiteboard shapes
    if (whiteboardShapes.has(whiteboardId)) {
      whiteboardShapes.set(whiteboardId, shapes)
    }

    socket.to(whiteboardId).emit("undo-redo-update", {
      instanceId,
      shapes,
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
      let userRemoved = false
      let removedInstanceId = null
      let removedUserData = null

      whiteboard.forEach((userData, instanceId) => {
        if (userData.socketId === socket.id) {
          whiteboard.delete(instanceId)
          userRemoved = true
          removedInstanceId = instanceId
          removedUserData = userData
        }
      })

      if (userRemoved) {
        // Get updated counts
        const counts = getUserCounts(whiteboardId)

        console.log(`User ${removedUserData.user.name} left whiteboard ${whiteboardId}. New counts:`, counts)

        // Notify others in the room
        io.to(whiteboardId).emit("user-left", {
          instanceId: removedInstanceId,
          counts,
        })

        // Clean up empty whiteboards
        if (whiteboard.size === 0) {
          whiteboards.delete(whiteboardId)
          whiteboardShapes.delete(whiteboardId)
          console.log(`Whiteboard ${whiteboardId} cleaned up - no active users`)
        }
      }
    })
  })

  // Handle explicit leave
  socket.on("leave-whiteboard", ({ whiteboardId, instanceId }) => {
    const whiteboard = whiteboards.get(whiteboardId)
    if (whiteboard) {
      const userData = whiteboard.get(instanceId)
      whiteboard.delete(instanceId)

      // Get updated counts
      const counts = getUserCounts(whiteboardId)

      if (userData) {
        console.log(`User ${userData.user.name} left whiteboard ${whiteboardId}. New counts:`, counts)
      }

      // Notify others in the room
      socket.to(whiteboardId).emit("user-left", {
        instanceId,
        counts,
      })

      // Clean up empty whiteboards
      if (whiteboard.size === 0) {
        whiteboards.delete(whiteboardId)
        whiteboardShapes.delete(whiteboardId)
        console.log(`Whiteboard ${whiteboardId} cleaned up - no active users`)
      }
    }

    socket.leave(whiteboardId)
  })
})

app.get("/test", (req, res) => {
  res.json({ message: "Server is running!" })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`)
})
