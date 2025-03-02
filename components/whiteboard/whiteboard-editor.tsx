"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSocket } from "@/hooks/use-socket"
import { nanoid } from "nanoid"
import { useTheme } from "next-themes"
import { WhiteboardToolbar } from "./whiteboard-toolbar"
import { UserCursor } from "./user-cursor"
import { cn } from "@/lib/utils"
import axios from "axios"

interface Point {
  x: number
  y: number
}

interface Shape {
  id: string
  tool: string
  points: Point[]
  color: string
  width: number
  selected?: boolean
  transform?: {
    x: number
    y: number
    scale: number
    rotate: number
  }
}

interface WhiteboardEditorProps {
  id: string
  initialData: string
  isReadOnly: boolean
  currentUser:
    | {
        id: string
        name: string
        email: string
      }
    | undefined
}

export function WhiteboardEditor({ id, initialData, isReadOnly, currentUser }: WhiteboardEditorProps) {
  const { socket } = useSocket()
  const { resolvedTheme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [currentShape, setCurrentShape] = useState<Shape | null>(null)
  const [shapes, setShapes] = useState<Shape[]>([])
  const [selectedShape, setSelectedShape] = useState<Shape | null>(null)
  const [tool, setTool] = useState("pen")
  const [color, setColor] = useState("#FFFFFF") // Default to white for dark mode
  const [width, setWidth] = useState(2)
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; user: any }>>({})
  const [instanceId] = useState(() => nanoid())
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [startPanPoint, setStartPanPoint] = useState<Point | null>(null)

  // Initialize canvas context
  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    return ctx
  }, [])

  // Draw arrow
  const drawArrow = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point, width: number) => {
    const headLength = 10 + width
    const angle = Math.atan2(to.y - from.y, to.x - from.x)

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(to.x, to.y)
    ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()
  }, [])

  // Draw a single shape
  const drawShape = useCallback(
    (shape: Shape) => {
      const ctx = getContext()
      if (!ctx) return

      ctx.save()
      ctx.strokeStyle = shape.color
      ctx.fillStyle = shape.color
      ctx.lineWidth = shape.width
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (shape.transform) {
        ctx.translate(shape.transform.x, shape.transform.y)
        ctx.scale(shape.transform.scale, shape.transform.scale)
        ctx.rotate(shape.transform.rotate)
      }

      switch (shape.tool) {
        case "pen":
          ctx.beginPath()
          shape.points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y)
            } else {
              ctx.lineTo(point.x, point.y)
            }
          })
          ctx.stroke()
          break

        case "eraser":
          // For eraser, we use the same drawing method as pen but with canvas background color
          ctx.strokeStyle = "#1a1a1a" // Set color to background color
          ctx.beginPath()
          shape.points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y)
            } else {
              ctx.lineTo(point.x, point.y)
            }
          })
          ctx.stroke()
          break

        case "arrow":
          if (shape.points.length >= 2) {
            drawArrow(ctx, shape.points[0], shape.points[shape.points.length - 1], shape.width)
          }
          break

        case "rectangle":
          if (shape.points.length >= 2) {
            const start = shape.points[0];
            const end = shape.points[shape.points.length - 1];
            const width = end.x - start.x;
            const height = end.y - start.y;
            ctx.strokeRect(start.x, start.y, width, height);
          }
          break

        case "circle":
          if (shape.points.length >= 2) {
            const start = shape.points[0];
            const end = shape.points[shape.points.length - 1];
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            ctx.beginPath();
            ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break
      }

      if (shape.selected) {
        ctx.strokeStyle = "#00ff00"
        ctx.setLineDash([5, 5])
        ctx.strokeRect(
          shape.points[0].x - 5,
          shape.points[0].y - 5,
          (shape.points[1]?.x || 0) - shape.points[0].x + 10,
          (shape.points[1]?.y || 0) - shape.points[0].y + 10,
        )
        ctx.setLineDash([])
      }

      ctx.restore()
    },
    [getContext, drawArrow],
  )

  // Redraw entire canvas
  const redrawCanvas = useCallback(() => {
    const ctx = getContext()
    if (!ctx || !canvasRef.current) return

    // Clear canvas with dark background
    ctx.fillStyle = "#1a1a1a" // Dark background
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    // Apply pan offset
    ctx.save()
    ctx.translate(panOffset.x, panOffset.y)

    // Draw all shapes
    shapes.forEach(drawShape)

    // Draw current shape if any
    if (currentShape) {
      drawShape(currentShape)
    }

    ctx.restore()
  }, [getContext, drawShape, shapes, currentShape, panOffset])

  // Save canvas state to database
  const saveCanvasState = useCallback(
    async (shapesToSave: Shape[]) => {
      try {
        await axios.post(`/api/whiteboards/${id}`, {
          content: JSON.stringify(shapesToSave),
        });
      } catch (error) {
        console.error("Failed to save whiteboard state:", error);
      }
    },
    [id]
  );

  // Handle pointer up event
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setStartPanPoint(null)
      return
    }

    if (!isDrawing || !currentShape) return

    const updatedShapes = [...shapes, currentShape];
    setShapes(updatedShapes)
    setIsDrawing(false)
    setCurrentShape(null)

    socket?.emit("draw-end", {
      whiteboardId: id,
      instanceId,
      shape: currentShape,
    })

    // Save canvas state to database
    saveCanvasState(updatedShapes);
  }, [id, instanceId, isDrawing, currentShape, socket, isDragging, shapes, saveCanvasState]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setShapes([])
    socket?.emit("clear-canvas", {
      whiteboardId: id,
      instanceId,
    })
    
    // Save empty canvas state to database
    saveCanvasState([]);
  }, [id, instanceId, socket, saveCanvasState]);

  // Handle mouse/touch events
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isReadOnly) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left - panOffset.x
      const y = e.clientY - rect.top - panOffset.y

      if (tool === "hand") {
        setIsDragging(true)
        setStartPanPoint({ x: e.clientX, y: e.clientY })
        return
      }

      if (tool === "select") {
        const clickedShape = shapes.findLast((shape) => {
          const bounds = {
            x1: shape.points[0].x,
            y1: shape.points[0].y,
            x2: shape.points[1]?.x || shape.points[0].x,
            y2: shape.points[1]?.y || shape.points[0].y,
          }
          return x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2
        })

        if (clickedShape) {
          setSelectedShape(clickedShape)
          setShapes(
            shapes.map((s) => ({
              ...s,
              selected: s.id === clickedShape.id,
            })),
          )
          return
        }

        setSelectedShape(null)
        setShapes(shapes.map((s) => ({ ...s, selected: false })))
        return
      }

      // For eraser tool, we'll create a shape with the background color
      const newShape: Shape = {
        id: nanoid(),
        tool,
        points: [{ x, y }],
        color: tool === "eraser" ? "#1a1a1a" : color, // Use background color for eraser
        width: tool === "eraser" ? width * 2 : width, // Make eraser slightly larger
      }

      setIsDrawing(true)
      setCurrentShape(newShape)

      socket?.emit("draw-start", {
        whiteboardId: id,
        instanceId,
        shape: newShape,
      })
    },
    [id, instanceId, tool, color, width, isReadOnly, socket, shapes, panOffset],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left - panOffset.x
      const y = e.clientY - rect.top - panOffset.y

      // Update cursor position
      if (!isReadOnly && currentUser) {
        socket?.emit("cursor-move", {
          whiteboardId: id,
          instanceId,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          user: currentUser,
        })
      }

      if (isDragging && startPanPoint) {
        const dx = e.clientX - startPanPoint.x
        const dy = e.clientY - startPanPoint.y
        setPanOffset((prev) => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }))
        setStartPanPoint({ x: e.clientX, y: e.clientY })
        return
      }

      if (!isDrawing || !currentShape) return

      // For shapes like rectangle and circle, we only need the start and current point
      let updatedPoints;
      if (tool === "rectangle" || tool === "circle" || tool === "arrow") {
        // For these shapes, we only need the start and current point
        updatedPoints = [currentShape.points[0], { x, y }];
      } else {
        // For pen and eraser, we need all points
        updatedPoints = [...currentShape.points, { x, y }];
      }

      const updatedShape = {
        ...currentShape,
        points: updatedPoints,
      }

      setCurrentShape(updatedShape)

      socket?.emit("draw-progress", {
        whiteboardId: id,
        instanceId,
        shape: updatedShape,
      })
    },
    [id, instanceId, isDrawing, currentShape, isReadOnly, currentUser, socket, isDragging, startPanPoint, panOffset, tool],
  )

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width
      canvas.height = height
      redrawCanvas()
    }

    window.addEventListener("resize", handleResize)
    handleResize()

    return () => window.removeEventListener("resize", handleResize)
  }, [redrawCanvas])

  // Socket event handlers
  useEffect(() => {
    if (!socket || !currentUser) return

    socket.emit("join-whiteboard", {
      whiteboardId: id,
      instanceId,
      user: currentUser,
    })

    socket.on("draw-started", ({ instanceId: remoteId, shape }) => {
      if (remoteId !== instanceId) {
        console.log("Remote draw started:", shape);
        // For remote drawing, we need to add the shape to our temporary drawing state
        setCurrentShape(shape);
        drawShape(shape);
      }
    })

    socket.on("draw-progressed", ({ instanceId: remoteId, shape }) => {
      if (remoteId !== instanceId) {
        console.log("Remote draw progressed:", shape);
        // Update the current shape for remote drawing
        setCurrentShape(shape);
        // Force redraw
        redrawCanvas();
      }
    })

    socket.on("draw-ended", ({ instanceId: remoteId, shape }) => {
      if (remoteId !== instanceId) {
        console.log("Remote draw ended:", shape);
        setCurrentShape(null);
        setShapes((prev) => {
          const updatedShapes = [...prev, shape];
          // Save canvas state when receiving remote updates
          saveCanvasState(updatedShapes);
          return updatedShapes;
        });
      }
    })

    socket.on("canvas-cleared", ({ instanceId: remoteId }) => {
      if (remoteId !== instanceId) {
        console.log("Remote canvas cleared");
        setShapes([]);
        // Save empty canvas state when canvas is cleared remotely
        saveCanvasState([]);
      }
    })

    socket.on("cursor-update", (data) => {
      if (data.instanceId !== instanceId) {
        setCursors((prev) => ({
          ...prev,
          [data.instanceId]: {
            x: data.x,
            y: data.y,
            user: data.user,
          },
        }))
      }
    })

    socket.on("user-left", (data) => {
      setCursors((prev) => {
        const next = { ...prev }
        delete next[data.instanceId]
        return next
      })
    })

    return () => {
      socket.emit("leave-whiteboard", {
        whiteboardId: id,
        instanceId,
      })
      socket.off("draw-started")
      socket.off("draw-progressed")
      socket.off("draw-ended")
      socket.off("canvas-cleared")
      socket.off("cursor-update")
      socket.off("user-left")
    }
  }, [socket, id, instanceId, currentUser, drawShape])

  // Redraw canvas when shapes change
  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas, shapes, currentShape, panOffset])

  // Load initial data
  useEffect(() => {
    if (initialData) {
      try {
        // Try to parse the initial data as JSON
        const parsedData = JSON.parse(initialData);
        if (Array.isArray(parsedData)) {
          setShapes(parsedData);
          console.log("Loaded initial data:", parsedData.length, "shapes");
        } else {
          console.warn("Initial data is not an array:", parsedData);
        }
      } catch (error) {
        console.error("Failed to parse initial data:", error);
        // If parsing fails, initialize with empty array
        setShapes([]);
      }
    } else {
      // If no initial data, initialize with empty array
      setShapes([]);
      console.log("No initial data provided, starting with empty canvas");
    }
  }, [initialData]);

  return (
    <div className="relative h-full w-full bg-[#1a1a1a]">
      <WhiteboardToolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        width={width}
        setWidth={setWidth}
        isReadOnly={isReadOnly}
        onClear={clearCanvas}
      />
      <canvas
        ref={canvasRef}
        className={cn(
          "h-full w-full touch-none",
          isReadOnly && "cursor-not-allowed",
          tool === "hand" && "cursor-grab",
          isDragging && "cursor-grabbing",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {Object.entries(cursors).map(([clientId, cursor]) => (
        <UserCursor key={clientId} x={cursor.x} y={cursor.y} name={cursor.user.name} />
      ))}
    </div>
  )
}

