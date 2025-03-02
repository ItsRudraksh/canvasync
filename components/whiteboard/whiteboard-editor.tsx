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
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null)
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
  const [shapesToErase, setShapesToErase] = useState<string[]>([])

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
      
      // Check if shape is marked for erasing
      const isMarkedForErase = shapesToErase.includes(shape.id);
      
      // Apply semi-transparent style for shapes marked for erasing
      if (isMarkedForErase) {
        ctx.globalAlpha = 0.3;
      }
      
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
        
        // Get shape bounds
        const bounds = getShapeBounds(shape);
        
        // Draw selection rectangle
        ctx.strokeRect(
          bounds.x1 - 5,
          bounds.y1 - 5,
          bounds.x2 - bounds.x1 + 10,
          bounds.y2 - bounds.y1 + 10
        )
        
        // Draw resize handles if shape is selected
        if (shape.selected) {
          ctx.fillStyle = "#00ff00";
          
          // Draw resize handles at corners
          const handleSize = 8;
          
          // Top-left
          ctx.fillRect(bounds.x1 - handleSize/2, bounds.y1 - handleSize/2, handleSize, handleSize);
          
          // Top-right
          ctx.fillRect(bounds.x2 - handleSize/2, bounds.y1 - handleSize/2, handleSize, handleSize);
          
          // Bottom-left
          ctx.fillRect(bounds.x1 - handleSize/2, bounds.y2 - handleSize/2, handleSize, handleSize);
          
          // Bottom-right
          ctx.fillRect(bounds.x2 - handleSize/2, bounds.y2 - handleSize/2, handleSize, handleSize);
        }
        
        ctx.setLineDash([])
      }

      ctx.restore()
    },
    [getContext, drawArrow, shapesToErase],
  )

  // Helper function to get shape bounds
  const getShapeBounds = useCallback((shape: Shape) => {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    
    // Calculate bounds based on shape type
    switch (shape.tool) {
      case "pen":
      case "eraser":
        // For pen and eraser, find min/max of all points
        shape.points.forEach(point => {
          x1 = Math.min(x1, point.x);
          y1 = Math.min(y1, point.y);
          x2 = Math.max(x2, point.x);
          y2 = Math.max(y2, point.y);
        });
        break;
        
      case "rectangle":
      case "arrow":
        // For rectangle and arrow, use first and last point
        if (shape.points.length >= 2) {
          const start = shape.points[0];
          const end = shape.points[shape.points.length - 1];
          x1 = Math.min(start.x, end.x);
          y1 = Math.min(start.y, end.y);
          x2 = Math.max(start.x, end.x);
          y2 = Math.max(start.y, end.y);
        }
        break;
        
      case "circle":
        // For circle, calculate bounds based on radius
        if (shape.points.length >= 2) {
          const start = shape.points[0];
          const end = shape.points[shape.points.length - 1];
          const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          x1 = start.x - radius;
          y1 = start.y - radius;
          x2 = start.x + radius;
          y2 = start.y + radius;
        }
        break;
    }
    
    return { x1, y1, x2, y2 };
  }, []);

  // Helper function to check if a point is near a resize handle
  const getResizeHandle = useCallback((shape: Shape, x: number, y: number) => {
    if (!shape.selected) return null;
    
    const bounds = getShapeBounds(shape);
    const handleSize = 8;
    
    // Check each handle
    // Top-left
    if (Math.abs(x - bounds.x1) <= handleSize && Math.abs(y - bounds.y1) <= handleSize) {
      return "tl";
    }
    
    // Top-right
    if (Math.abs(x - bounds.x2) <= handleSize && Math.abs(y - bounds.y1) <= handleSize) {
      return "tr";
    }
    
    // Bottom-left
    if (Math.abs(x - bounds.x1) <= handleSize && Math.abs(y - bounds.y2) <= handleSize) {
      return "bl";
    }
    
    // Bottom-right
    if (Math.abs(x - bounds.x2) <= handleSize && Math.abs(y - bounds.y2) <= handleSize) {
      return "br";
    }
    
    return null;
  }, [getShapeBounds]);

  // Helper function to resize a shape
  const resizeShape = useCallback((shape: Shape, handle: string, dx: number, dy: number) => {
    const newPoints = [...shape.points];
    
    switch (shape.tool) {
      case "pen":
      case "eraser":
        // For pen and eraser, we need to scale all points
        const bounds = getShapeBounds(shape);
        const width = bounds.x2 - bounds.x1;
        const height = bounds.y2 - bounds.y1;
        
        // Calculate scale factors based on which handle is being dragged
        let scaleX = 1;
        let scaleY = 1;
        let translateX = 0;
        let translateY = 0;
        
        switch (handle) {
          case "tl": // Top-left
            scaleX = (width - dx) / width;
            scaleY = (height - dy) / height;
            translateX = dx;
            translateY = dy;
            break;
          case "tr": // Top-right
            scaleX = (width + dx) / width;
            scaleY = (height - dy) / height;
            translateY = dy;
            break;
          case "bl": // Bottom-left
            scaleX = (width - dx) / width;
            scaleY = (height + dy) / height;
            translateX = dx;
            break;
          case "br": // Bottom-right
            scaleX = (width + dx) / width;
            scaleY = (height + dy) / height;
            break;
        }
        
        // Apply scaling to all points
        return {
          ...shape,
          points: shape.points.map(point => ({
            x: bounds.x1 + (point.x - bounds.x1) * scaleX + translateX,
            y: bounds.y1 + (point.y - bounds.y1) * scaleY + translateY
          }))
        };
        
      case "rectangle":
      case "arrow":
        if (shape.points.length >= 2) {
          const start = {...shape.points[0]};
          const end = {...shape.points[1]};
          
          switch (handle) {
            case "tl":
              start.x += dx;
              start.y += dy;
              break;
            case "tr":
              end.x += dx;
              start.y += dy;
              break;
            case "bl":
              start.x += dx;
              end.y += dy;
              break;
            case "br":
              end.x += dx;
              end.y += dy;
              break;
          }
          
          newPoints[0] = start;
          newPoints[1] = end;
        }
        break;
        
      case "circle":
        if (shape.points.length >= 2) {
          const center = shape.points[0];
          const edge = {...shape.points[1]};
          
          // For circle, adjust the radius point based on the handle
          const currentRadius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
          const angle = Math.atan2(edge.y - center.y, edge.x - center.x);
          
          // Calculate new radius based on the handle and movement
          let newRadius = currentRadius;
          
          switch (handle) {
            case "tl":
            case "tr":
            case "bl":
            case "br":
              // Adjust radius based on the distance change
              const distChange = Math.sqrt(dx * dx + dy * dy);
              if ((dx < 0 || dy < 0) && distChange > 0) {
                newRadius -= distChange / 2;
              } else {
                newRadius += distChange / 2;
              }
              break;
          }
          
          // Ensure minimum radius
          newRadius = Math.max(5, newRadius);
          
          // Update the edge point
          edge.x = center.x + newRadius * Math.cos(angle);
          edge.y = center.y + newRadius * Math.sin(angle);
          
          newPoints[1] = edge;
        }
        break;
    }
    
    return {
      ...shape,
      points: newPoints
    };
  }, [getShapeBounds]);

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

  // Handle eraser functionality
  const handleEraserMove = useCallback((x: number, y: number) => {
    // Find shapes that intersect with the eraser
    const eraserRadius = width * 3; // Increase eraser size for better usability
    const shapesToHighlight = shapes
      .filter(shape => {
        const bounds = getShapeBounds(shape);
        // Check if eraser circle intersects with shape bounds
        return (
          x >= bounds.x1 - eraserRadius &&
          x <= bounds.x2 + eraserRadius &&
          y >= bounds.y1 - eraserRadius &&
          y <= bounds.y2 + eraserRadius
        );
      })
      .map(shape => shape.id);
    
    // Update shapes to erase - add to existing list rather than replacing
    setShapesToErase(prev => {
      // Create a Set from the previous and new shapes to erase to remove duplicates
      const combinedSet = new Set([...prev, ...shapesToHighlight]);
      const newShapesToErase = Array.from(combinedSet);
      
      // Emit socket event for eraser highlighting
      socket?.emit("eraser-highlight", {
        whiteboardId: id,
        instanceId,
        shapesToErase: newShapesToErase
      });
      
      return newShapesToErase;
    });
  }, [shapes, width, getShapeBounds, socket, id, instanceId]);
  
  // Handle eraser end
  const handleEraserEnd = useCallback(() => {
    if (shapesToErase.length === 0) return;
    
    // Remove the highlighted shapes
    const updatedShapes = shapes.filter(shape => !shapesToErase.includes(shape.id));
    
    setShapes(updatedShapes);
    
    // Emit socket event for shape update
    socket?.emit("shape-update-end", {
      whiteboardId: id,
      instanceId,
      shapes: updatedShapes
    });
    
    // Save canvas state
    saveCanvasState(updatedShapes);
    
    // Clear shapes to erase
    setShapesToErase([]);
  }, [id, instanceId, shapes, shapesToErase, socket, saveCanvasState]);

  // Effect to reset shapesToErase when tool changes
  useEffect(() => {
    // Clear shapes to erase when switching away from eraser tool
    if (tool !== "eraser") {
      setShapesToErase([]);
    }
  }, [tool]);

  // Handle pointer up event
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setStartPanPoint(null)
      
      // If we were dragging a selected shape, save the state
      if (selectedShape && dragStartPoint) {
        // Final update for other users
        socket?.emit("shape-update-end", {
          whiteboardId: id,
          instanceId,
          shapes: shapes
        });
        
        saveCanvasState(shapes);
      }
      
      setDragStartPoint(null);
      return
    }
    
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      
      // Save state after resizing
      if (selectedShape) {
        // Final update for other users
        socket?.emit("shape-update-end", {
          whiteboardId: id,
          instanceId,
          shapes: shapes
        });
        
        saveCanvasState(shapes);
      }
      
      return;
    }
    
    // Handle eraser end
    if (isDrawing && tool === "eraser") {
      handleEraserEnd();
      setIsDrawing(false);
      setCurrentShape(null);
      return;
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
  }, [id, instanceId, isDrawing, currentShape, socket, isDragging, shapes, saveCanvasState, selectedShape, dragStartPoint, isResizing, tool, handleEraserEnd]);

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

  // Handle pointer down event
  const handlePointerDown = useCallback(
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

      // Check if we're clicking on a resize handle of a selected shape
      if (selectedShape) {
        const handle = getResizeHandle(selectedShape, x, y);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setDragStartPoint({ x, y });
          return;
        }
      }
      
      // Check if we're clicking on a shape to select it
      if (tool === "select") {
        // Find the topmost shape that contains the point
        const clickedShape = [...shapes].reverse().find(shape => {
          const bounds = getShapeBounds(shape);
          return (
            x >= bounds.x1 &&
            x <= bounds.x2 &&
            y >= bounds.y1 &&
            y <= bounds.y2
          );
        });
        
        if (clickedShape) {
          // Update the selected shape
          setSelectedShape(clickedShape);
          
          // Mark the shape as selected in the shapes array
          const updatedShapes = shapes.map(s => ({
            ...s,
            selected: s.id === clickedShape.id
          }));
          
          setShapes(updatedShapes);
          
          // Start dragging the shape
          setIsDragging(true);
          setDragStartPoint({ x, y });
          return;
        } else {
          // Deselect if clicking on empty space
          setSelectedShape(null);
          setShapes(shapes.map(s => ({ ...s, selected: false })));
        }
      }

      // Handle panning with hand tool
      if (tool === "hand") {
        setIsDragging(true)
        setStartPanPoint({ x: e.clientX, y: e.clientY })
        return
      }
      
      // Handle eraser tool
      if (tool === "eraser") {
        setIsDrawing(true);
        
        // Reset shapes to erase when starting a new eraser action
        // only if we're not continuing from a previous eraser action
        if (!isDrawing) {
          setShapesToErase([]);
        }
        
        // Create a new shape for visual feedback
        const newShape: Shape = {
          id: nanoid(),
          tool: "eraser",
          points: [{ x, y }],
          color: "#1a1a1a", // Background color
          width: width,
          selected: false,
        };
        
        setCurrentShape(newShape);
        
        // Find shapes to erase
        handleEraserMove(x, y);
        
        return;
      }

      // Handle drawing tools
      setIsDrawing(true)

      // Create a new shape
      const newShape: Shape = {
        id: nanoid(),
        tool,
        points: [{ x, y }],
        color,
        width,
        selected: false,
      }

      setCurrentShape(newShape)

      socket?.emit("draw-start", {
        whiteboardId: id,
        instanceId,
        shape: newShape,
      })
    },
    [id, instanceId, tool, color, width, isReadOnly, currentUser, socket, shapes, selectedShape, getResizeHandle, getShapeBounds, panOffset, handleEraserMove],
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

      // Handle panning with hand tool
      if (isDragging && startPanPoint && tool === "hand") {
        const dx = e.clientX - startPanPoint.x
        const dy = e.clientY - startPanPoint.y
        setPanOffset((prev) => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }))
        setStartPanPoint({ x: e.clientX, y: e.clientY })
        return
      }
      
      // Handle dragging selected shape
      if (isDragging && dragStartPoint && selectedShape && tool === "select") {
        const dx = x - dragStartPoint.x;
        const dy = y - dragStartPoint.y;
        
        // Update the shape's points
        const updatedShapes = shapes.map(shape => {
          if (shape.id === selectedShape.id) {
            // Create new points array with updated positions
            const newPoints = shape.points.map(point => ({
              x: point.x + dx,
              y: point.y + dy
            }));
            
            return {
              ...shape,
              points: newPoints
            };
          }
          return shape;
        });
        
        setShapes(updatedShapes);
        
        // Update the selected shape
        const updatedSelectedShape = updatedShapes.find(s => s.id === selectedShape.id);
        if (updatedSelectedShape) {
          setSelectedShape(updatedSelectedShape);
          
          // Emit socket event for shape update
          socket?.emit("shape-update", {
            whiteboardId: id,
            instanceId,
            shape: updatedSelectedShape,
            shapes: updatedShapes
          });
        }
        
        // Update drag start point
        setDragStartPoint({ x, y });
        return;
      }
      
      // Handle smart eraser
      if (isDrawing && tool === "eraser") {
        // Update the current shape for visual feedback
        if (currentShape) {
          const updatedPoints = [...currentShape.points, { x, y }];
          const updatedShape = {
            ...currentShape,
            points: updatedPoints,
          };
          setCurrentShape(updatedShape);
        }
        
        // Find shapes to erase
        handleEraserMove(x, y);
        
        return;
      }
      
      // Handle resizing selected shape
      if (isResizing && resizeHandle && selectedShape) {
        // Initialize dragStartPoint if it's null
        if (!dragStartPoint) {
          setDragStartPoint({ x, y });
          return;
        }
        
        const dx = x - dragStartPoint.x;
        const dy = y - dragStartPoint.y;
        
        // Resize the shape
        const updatedShapes = shapes.map(shape => {
          if (shape.id === selectedShape.id) {
            return resizeShape(shape, resizeHandle, dx, dy);
          }
          return shape;
        });
        
        setShapes(updatedShapes);
        
        // Update the selected shape
        const updatedSelectedShape = updatedShapes.find(s => s.id === selectedShape.id);
        if (updatedSelectedShape) {
          setSelectedShape(updatedSelectedShape);
          
          // Emit socket event for shape update
          socket?.emit("shape-update", {
            whiteboardId: id,
            instanceId,
            shape: updatedSelectedShape,
            shapes: updatedShapes
          });
        }
        
        // Update drag start point
        setDragStartPoint({ x, y });
        return;
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
    [id, instanceId, isDrawing, currentShape, isReadOnly, currentUser, socket, isDragging, startPanPoint, panOffset, tool, dragStartPoint, selectedShape, shapes, isResizing, resizeHandle, resizeShape, handleEraserMove],
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
    
    socket.on("shape-updated", ({ instanceId: remoteId, shape, shapes: remoteShapes }) => {
      if (remoteId !== instanceId) {
        console.log("Remote shape updated:", shape);
        // Update shapes with the remote shapes
        setShapes(remoteShapes);
        // Force redraw
        redrawCanvas();
      }
    })
    
    socket.on("shape-update-ended", ({ instanceId: remoteId, shapes: remoteShapes }) => {
      if (remoteId !== instanceId) {
        console.log("Remote shape update ended");
        // Update shapes with the final remote shapes
        setShapes(remoteShapes);
        // Force redraw
        redrawCanvas();
      }
    })

    socket.on("eraser-highlighted", ({ instanceId: remoteId, shapesToErase: remoteShapesToErase }) => {
      if (remoteId !== instanceId) {
        console.log("Remote eraser highlight:", remoteShapesToErase.length, "shapes");
        // Update shapes to erase with the remote shapes to erase
        setShapesToErase(remoteShapesToErase);
        // Force redraw to show the highlighted shapes
        redrawCanvas();
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
      socket.off("shape-updated")
      socket.off("shape-update-ended")
      socket.off("eraser-highlighted")
      socket.off("canvas-cleared")
      socket.off("cursor-update")
      socket.off("user-left")
    }
  }, [socket, id, instanceId, currentUser, drawShape, redrawCanvas, saveCanvasState])

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
      
      {/* Property editor for selected shape */}
      {selectedShape && (
        <div className="absolute right-4 top-4 flex flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-800/90 p-4 shadow-lg backdrop-blur z-10">
          <div className="text-sm font-medium text-white mb-2 flex items-center justify-between">
            <span>Edit {selectedShape.tool.charAt(0).toUpperCase() + selectedShape.tool.slice(1)}</span>
            <button 
              className="text-zinc-400 hover:text-white"
              onClick={() => {
                // Deselect the shape
                setSelectedShape(null);
                setShapes(shapes.map(s => ({ ...s, selected: false })));
              }}
            >
              ✕
            </button>
          </div>
          
          {/* Color picker - only show for non-eraser tools */}
          {selectedShape.tool !== "eraser" && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Color</label>
              <div className="flex flex-wrap gap-1 mb-3">
                {["#FFFFFF", "#FF4444", "#44FF44", "#4444FF", "#FFFF44", "#FF44FF", "#44FFFF"].map((c) => (
                  <button
                    key={c}
                    className="h-6 w-6 rounded-full p-0 flex items-center justify-center border border-zinc-700 hover:border-white transition-colors"
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      // Update the selected shape's color
                      const updatedShapes = shapes.map(shape => {
                        if (shape.id === selectedShape.id) {
                          // For eraser, always keep the background color
                          if (shape.tool === "eraser") {
                            return shape;
                          }
                          
                          return {
                            ...shape,
                            color: c
                          };
                        }
                        return shape;
                      });
                      
                      setShapes(updatedShapes);
                      
                      // Update the selected shape
                      const updatedSelectedShape = updatedShapes.find(s => s.id === selectedShape.id);
                      if (updatedSelectedShape) {
                        setSelectedShape(updatedSelectedShape);
                        
                        // Emit socket event for shape update
                        socket?.emit("shape-update", {
                          whiteboardId: id,
                          instanceId,
                          shape: updatedSelectedShape,
                          shapes: updatedShapes
                        });
                        
                        // Save canvas state
                        saveCanvasState(updatedShapes);
                      }
                    }}
                  >
                    {selectedShape.color === c && <div className="h-3 w-3 rounded-full bg-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Width slider */}
          <div className="mb-2">
            <label className="text-xs text-zinc-400 mb-1 block">Width: {selectedShape.width}px</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="20"
                value={selectedShape.width}
                onChange={(e) => {
                  const newWidth = parseInt(e.target.value);
                  
                  // Update the selected shape's width
                  const updatedShapes = shapes.map(shape => {
                    if (shape.id === selectedShape.id) {
                      return {
                        ...shape,
                        width: newWidth
                      };
                    }
                    return shape;
                  });
                  
                  setShapes(updatedShapes);
                  
                  // Update the selected shape
                  const updatedSelectedShape = updatedShapes.find(s => s.id === selectedShape.id);
                  if (updatedSelectedShape) {
                    setSelectedShape(updatedSelectedShape);
                    
                    // Emit socket event for shape update
                    socket?.emit("shape-update", {
                      whiteboardId: id,
                      instanceId,
                      shape: updatedSelectedShape,
                      shapes: updatedShapes
                    });
                    
                    // Save canvas state
                    saveCanvasState(updatedShapes);
                  }
                }}
                className="w-full accent-blue-500"
              />
              <div 
                className="h-6 w-6 rounded-full flex-shrink-0 border border-zinc-600"
                style={{ 
                  backgroundColor: selectedShape.tool === "eraser" ? "#1a1a1a" : selectedShape.color,
                }}
              >
                <div 
                  className="h-full w-full rounded-full flex items-center justify-center"
                >
                  <div 
                    className="rounded-full bg-current"
                    style={{ 
                      width: `${Math.min(selectedShape.width * 1.2, 20)}px`, 
                      height: `${Math.min(selectedShape.width * 1.2, 20)}px`,
                      backgroundColor: selectedShape.tool === "eraser" ? "white" : selectedShape.color
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Delete button */}
          <button
            className="mt-1 bg-red-500 hover:bg-red-600 text-white py-1.5 px-3 rounded text-xs font-medium transition-colors"
            onClick={() => {
              // Remove the selected shape
              const updatedShapes = shapes.filter(shape => shape.id !== selectedShape.id);
              
              setShapes(updatedShapes);
              setSelectedShape(null);
              
              // Emit socket event for shape update
              socket?.emit("shape-update-end", {
                whiteboardId: id,
                instanceId,
                shapes: updatedShapes
              });
              
              // Save canvas state
              saveCanvasState(updatedShapes);
            }}
          >
            Delete Shape
          </button>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className={cn(
          "h-full w-full touch-none",
          isReadOnly && "cursor-not-allowed",
          tool === "hand" && "cursor-grab",
          isDragging && tool === "hand" && "cursor-grabbing",
          tool === "select" && "cursor-pointer",
          isResizing && "cursor-nwse-resize"
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

