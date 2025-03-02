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
import { Textarea } from "@/components/ui/textarea"
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable"

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
  multiSelected?: boolean
  transform?: {
    x: number
    y: number
    scale: number
    rotate: number
  }
  text?: string
  isEditing?: boolean
  fontSize?: number
  textWidth?: number
  textHeight?: number
  controlPoint?: Point  // Control point for curved arrows
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
  
  // Area selection state
  const [selectionBox, setSelectionBox] = useState<{start: Point, end: Point} | null>(null)
  const [isAreaSelecting, setIsAreaSelecting] = useState(false)
  const [multiSelectedShapes, setMultiSelectedShapes] = useState<Shape[]>([])
  const [isMultiDragging, setIsMultiDragging] = useState(false)
  
  // History state for undo/redo
  const [history, setHistory] = useState<Shape[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [activeTextEditor, setActiveTextEditor] = useState<Shape | null>(null)
  const textEditorRef = useRef<HTMLTextAreaElement>(null)
  const textEditorContainerRef = useRef<HTMLDivElement>(null)
  const [textEditorSize, setTextEditorSize] = useState({ width: 200, height: 100 })
  const [isResizingTextEditor, setIsResizingTextEditor] = useState(false)
  
  // Clipboard state for copy/paste
  const [clipboardShapes, setClipboardShapes] = useState<Shape[]>([])
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null)

  // Initialize canvas context
  const getContext = useCallback(() => {
    if (canvasRef.current) {
      return canvasRef.current.getContext("2d")
    }
    return null
  }, [canvasRef])

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
        
      case "diamond":
        // For diamond, use first and last point to calculate bounds
        if (shape.points.length >= 2) {
          const start = shape.points[0];
          const end = shape.points[shape.points.length - 1];
          const width = Math.abs(end.x - start.x);
          const height = Math.abs(end.y - start.y);
          x1 = Math.min(start.x, end.x);
          y1 = Math.min(start.y, end.y);
          x2 = Math.max(start.x, end.x);
          y2 = Math.max(start.y, end.y);
        }
        break;
        
      case "curved-arrow":
        // For curved arrow, include the control point in the bounds calculation
        if (shape.points.length >= 2) {
          const start = shape.points[0];
          const end = shape.points[shape.points.length - 1];
          const controlPoint = shape.controlPoint || {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2 - 50
          };
          
          x1 = Math.min(start.x, end.x, controlPoint.x);
          y1 = Math.min(start.y, end.y, controlPoint.y);
          x2 = Math.max(start.x, end.x, controlPoint.x);
          y2 = Math.max(start.y, end.y, controlPoint.y);
          
          // Add some padding to make selection easier
          const padding = 10;
          x1 -= padding;
          y1 -= padding;
          x2 += padding;
          y2 += padding;
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
        
      case "text":
        // For text, calculate bounds based on text content
        if (shape.points.length > 0 && shape.text) {
          const point = shape.points[0];
          const ctx = getContext();
          if (ctx) {
            const fontSize = shape.fontSize || shape.width * 10;
            ctx.font = `${fontSize}px 'Segoe Print', 'Comic Sans MS', cursive`;
            
            if (shape.textWidth) {
              // If text has a defined width (for wrapping), use that
              x1 = point.x;
              y1 = point.y;
              x2 = point.x + shape.textWidth;
              
              // Calculate height based on text wrapping and line breaks
              const lines = shape.text.split('\n');
              let lineCount = 0;
              
              lines.forEach(line => {
                // Count empty lines
                if (line.trim() === '') {
                  lineCount++;
                  return;
                }
                
                // Count wrapped lines
                const words = line.split(' ');
                let currentLine = '';
                
                for (let i = 0; i < words.length; i++) {
                  const testLine = currentLine + words[i] + ' ';
                  const metrics = ctx.measureText(testLine);
                  const testWidth = metrics.width;
                  
                  if (testWidth > (shape.textWidth || 0) && i > 0) {
                    currentLine = words[i] + ' ';
                    lineCount++;
                  } else {
                    currentLine = testLine;
                  }
                }
                
                // Count the last line of each paragraph
                if (currentLine.trim() !== '') {
                  lineCount++;
                }
              });
              
              // Ensure at least one line
              lineCount = Math.max(1, lineCount);
              y2 = point.y + lineCount * fontSize * 1.2;
            } else {
              // Simple text without wrapping, but still respect line breaks
              const lines = shape.text.split('\n');
              const metrics = ctx.measureText(shape.text);
              x1 = point.x;
              y1 = point.y;
              x2 = point.x + metrics.width;
              y2 = point.y + lines.length * fontSize * 1.2;
            }
          }
        }
        break;
    }
    
    return { x1, y1, x2, y2 };
  }, [getContext]);

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

  // Draw curved arrow
  const drawCurvedArrow = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point, controlPoint: Point, width: number, isSelected: boolean) => {
    const headLength = 10 + width
    
    // Draw the curved path
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, to.x, to.y)
    ctx.stroke()
    
    // Calculate the angle at the end point for the arrow head
    // We need to find the tangent of the curve at the end point
    // For a quadratic curve, the tangent at t=1 is from the control point to the end point
    const angle = Math.atan2(to.y - controlPoint.y, to.x - controlPoint.x)
    
    // Draw the arrow head
    ctx.beginPath()
    ctx.moveTo(to.x, to.y)
    ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()
    
    // Only show control point and guide lines when selected
    if (isSelected) {
      // Draw the control point
      ctx.save()
      ctx.fillStyle = "#4285f4" // Google blue
      ctx.beginPath()
      ctx.arc(controlPoint.x, controlPoint.y, 5, 0, 2 * Math.PI)
      ctx.fill()
      
      // Draw lines from control point to endpoints
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(controlPoint.x, controlPoint.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
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

        case "curved-arrow":
          if (shape.points.length >= 2) {
            // If no control point exists, create a default one
            const controlPoint = shape.controlPoint || {
              x: (shape.points[0].x + shape.points[shape.points.length - 1].x) / 2,
              y: (shape.points[0].y + shape.points[shape.points.length - 1].y) / 2 - 50 // Offset upward by default
            }
            
            // Draw the curved arrow
            drawCurvedArrow(ctx, shape.points[0], shape.points[shape.points.length - 1], controlPoint, shape.width, !!shape.selected)
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

        case "diamond":
          if (shape.points.length >= 2) {
            const start = shape.points[0];
            const end = shape.points[shape.points.length - 1];
            const width = end.x - start.x;
            const height = end.y - start.y;
            
            // Draw diamond shape
            ctx.beginPath();
            ctx.moveTo(start.x + width/2, start.y); // Top point
            ctx.lineTo(start.x + width, start.y + height/2); // Right point
            ctx.lineTo(start.x + width/2, start.y + height); // Bottom point
            ctx.lineTo(start.x, start.y + height/2); // Left point
            ctx.closePath();
            ctx.stroke();
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
        
        case "text":
          if (shape.points.length > 0 && shape.text) {
            const point = shape.points[0];
            const fontSize = shape.fontSize || shape.width * 10;
            
            // Use a handwriting-like font
            ctx.font = `${fontSize}px 'Segoe Print', 'Comic Sans MS', cursive`;
            ctx.textBaseline = "top";
            
            // If the shape is being edited, don't render it (the textarea will show instead)
            if (shape.isEditing) {
              return;
            }
            
            // Always split by newlines first to preserve explicit line breaks
            const lines = shape.text.split('\n');
            let y = point.y;
            
            lines.forEach(line => {
              // For each explicit line, also handle word wrapping if needed
              if (shape.textWidth) {
                const words = line.split(' ');
                let currentLine = '';
                
                // Handle empty lines (just a newline character)
                if (line.trim() === '') {
                  y += fontSize * 1.2; // Add line height for empty lines
                  return;
                }
                
                for (let i = 0; i < words.length; i++) {
                  const testLine = currentLine + words[i] + ' ';
                  const metrics = ctx.measureText(testLine);
                  const testWidth = metrics.width;
                  
                  if (testWidth > (shape.textWidth || 0) && i > 0) {
                    ctx.fillText(currentLine, point.x, y);
                    currentLine = words[i] + ' ';
                    y += fontSize * 1.2; // Line height
                  } else {
                    currentLine = testLine;
                  }
                }
                
                // Draw the last line of this paragraph
                if (currentLine.trim() !== '') {
                  ctx.fillText(currentLine, point.x, y);
                  y += fontSize * 1.2; // Line height
                }
              } else {
                // No width constraint, just draw the line
                ctx.fillText(line, point.x, y);
                y += fontSize * 1.2; // Line height
              }
            });
          }
          break
      }

      // Draw selection indicator for selected shape
      if (shape.selected) {
        // Save current line width
        const originalLineWidth = ctx.lineWidth;
        
        // Set fixed line width for selection outline
        ctx.lineWidth = 2;
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
        
        // Restore original line width
        ctx.lineWidth = originalLineWidth;
      }
      
      // Draw multi-selection indicator
      if (shape.multiSelected) {
        // Save current line width
        const originalLineWidth = ctx.lineWidth;
        
        // Set fixed line width for multi-selection outline
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#4285f4" // Google blue
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
        
        ctx.setLineDash([])
        
        // Restore original line width
        ctx.lineWidth = originalLineWidth;
      }

      ctx.restore()
    },
    [getContext, drawArrow, drawCurvedArrow, shapesToErase, getShapeBounds],
  )

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
    
    // Check for control point on curved arrows
    if (shape.tool === "curved-arrow" && shape.selected) {
      const controlPoint = shape.controlPoint || {
        x: (shape.points[0].x + shape.points[shape.points.length - 1].x) / 2,
        y: (shape.points[0].y + shape.points[shape.points.length - 1].y) / 2 - 50
      };
      
      if (Math.abs(x - controlPoint.x) <= handleSize && Math.abs(y - controlPoint.y) <= handleSize) {
        return "control";
      }
    }
    
    return null;
  }, [getShapeBounds]);

  // Helper function to resize a shape
  const resizeShape = useCallback((shape: Shape, handle: string, dx: number, dy: number) => {
    const newPoints = [...shape.points];
    
    switch (shape.tool) {
      case "rectangle":
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
      
      case "diamond":
        if (shape.points.length >= 2) {
          const start = {...shape.points[0]};
          const end = {...shape.points[1]};
          
          // Adjust points based on the handle
          switch (handle) {
            case "tl": // Top-left
              start.x += dx;
              start.y += dy;
              break;
            case "tr": // Top-right
              end.x += dx;
              start.y += dy;
              break;
            case "bl": // Bottom-left
              start.x += dx;
              end.y += dy;
              break;
            case "br": // Bottom-right
              end.x += dx;
              end.y += dy;
              break;
          }
          
          newPoints[0] = start;
          newPoints[1] = end;
        }
        break;
      
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
      
      case "curved-arrow":
        if (shape.points.length >= 2) {
          // Check if we're dragging the control point
          if (handle === "control") {
            // Update the control point
            return {
              ...shape,
              controlPoint: {
                x: (shape.controlPoint?.x || 0) + dx,
                y: (shape.controlPoint?.y || 0) + dy
              }
            };
          } else {
            // Otherwise handle the endpoints
            const start = {...shape.points[0]};
            const end = {...shape.points[1]};
            const oldStart = {...shape.points[0]};
            const oldEnd = {...shape.points[1]};
            
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
            
            // Adjust control point proportionally
            if (shape.controlPoint) {
              // Calculate how much each endpoint moved
              const startDx = start.x - oldStart.x;
              const startDy = start.y - oldStart.y;
              const endDx = end.x - oldEnd.x;
              const endDy = end.y - oldEnd.y;
              
              // Calculate the relative position of the control point between the endpoints
              const oldMidX = (oldStart.x + oldEnd.x) / 2;
              const oldMidY = (oldStart.y + oldEnd.y) / 2;
              
              // Calculate how far the control point is from the midpoint (as a percentage)
              const oldDiffX = shape.controlPoint.x - oldMidX;
              const oldDiffY = shape.controlPoint.y - oldMidY;
              
              // Calculate the new midpoint
              const newMidX = (start.x + end.x) / 2;
              const newMidY = (start.y + end.y) / 2;
              
              // Apply the same percentage offset to the new midpoint
              return {
                ...shape,
                points: newPoints,
                controlPoint: {
                  x: newMidX + oldDiffX + (startDx + endDx) / 2,
                  y: newMidY + oldDiffY + (startDy + endDy) / 2
                }
              };
            }
            
            // Return shape with updated points if there's no control point
            return {
              ...shape,
              points: newPoints
            };
          }
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

  // Draw selection box
  const drawSelectionBox = useCallback((box: {start: Point, end: Point}) => {
    const ctx = getContext()
    if (!ctx) return

    const { start, end } = box
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)

    // Draw semi-transparent blue rectangle
    ctx.fillStyle = 'rgba(66, 133, 244, 0.1)'
    ctx.fillRect(x, y, width, height)
    
    // Draw blue border
    ctx.strokeStyle = 'rgba(66, 133, 244, 0.8)'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 3])
    ctx.strokeRect(x, y, width, height)
    ctx.setLineDash([])
  }, [getContext])

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
    
    // Draw selection box if area selecting
    if (selectionBox) {
      drawSelectionBox(selectionBox)
    }

    ctx.restore()
  }, [getContext, drawShape, shapes, currentShape, panOffset, selectionBox, drawSelectionBox])

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

  // Add to history
  const addToHistory = useCallback((newShapes: Shape[]) => {
    // Create a deep copy of the shapes to avoid reference issues
    const shapesCopy = JSON.parse(JSON.stringify(newShapes));
    
    // If we're not at the end of the history, truncate it
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Add the new state to history
    newHistory.push(shapesCopy);
    
    // Limit history size to prevent memory issues (e.g., keep last 50 states)
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // Update undo/redo availability
    setCanUndo(newHistory.length > 1);
    setCanRedo(false);
  }, [history, historyIndex]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];
      
      // Update shapes with the previous state
      setShapes(previousState);
      setHistoryIndex(newIndex);
      
      // Update undo/redo availability
      setCanUndo(newIndex > 0);
      setCanRedo(true);
      
      // Emit socket event for undo
      socket?.emit("undo-redo", {
        whiteboardId: id,
        instanceId,
        shapes: previousState
      });
      
      // Save canvas state
      saveCanvasState(previousState);
    }
  }, [history, historyIndex, id, instanceId, socket, saveCanvasState]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      
      // Update shapes with the next state
      setShapes(nextState);
      setHistoryIndex(newIndex);
      
      // Update undo/redo availability
      setCanUndo(true);
      setCanRedo(newIndex < history.length - 1);
      
      // Emit socket event for redo
      socket?.emit("undo-redo", {
        whiteboardId: id,
        instanceId,
        shapes: nextState
      });
      
      // Save canvas state
      saveCanvasState(nextState);
    }
  }, [history, historyIndex, id, instanceId, socket, saveCanvasState]);

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
    
    // Add to history after erasing
    addToHistory(updatedShapes);
    
    // Clear shapes to erase
    setShapesToErase([]);
  }, [id, instanceId, shapes, shapesToErase, socket, saveCanvasState, addToHistory]);

  // Effect to reset shapesToErase when tool changes
  useEffect(() => {
    // Clear shapes to erase when switching away from eraser tool
    if (tool !== "eraser") {
      setShapesToErase([]);
    }
  }, [tool]);

  // Handle pointer up event
  const handlePointerUp = useCallback(() => {
    // Handle area selection completion
    if (isAreaSelecting && selectionBox) {
      // Calculate the selection box bounds
      const x1 = Math.min(selectionBox.start.x, selectionBox.end.x);
      const y1 = Math.min(selectionBox.start.y, selectionBox.end.y);
      const x2 = Math.max(selectionBox.start.x, selectionBox.end.x);
      const y2 = Math.max(selectionBox.start.y, selectionBox.end.y);
      
      // Find all shapes that intersect with the selection box
      const selectedShapes = shapes.filter(shape => {
        const bounds = getShapeBounds(shape);
        // Check if shape bounds intersect with selection box
        return (
          bounds.x2 >= x1 && 
          bounds.x1 <= x2 && 
          bounds.y2 >= y1 && 
          bounds.y1 <= y2
        );
      });
      
      // Mark selected shapes
      if (selectedShapes.length > 0) {
        const updatedShapes = shapes.map(shape => {
          const isSelected = selectedShapes.some(s => s.id === shape.id);
          return {
            ...shape,
            selected: false, // Clear single selection
            multiSelected: isSelected // Set multi-selection
          };
        });
        
        setShapes(updatedShapes);
        setMultiSelectedShapes(selectedShapes);
        setSelectedShape(null);
        
        // Emit socket event for shape update
        socket?.emit("shape-update", {
          whiteboardId: id,
          instanceId,
          shape: null,
          shapes: updatedShapes
        });
        
        // Automatically switch to select tool after area selection
        setTool("select");
      }
      
      // Clear selection box and area selecting state
      setSelectionBox(null);
      setIsAreaSelecting(false);
      
      return;
    }
    
    // Handle multi-dragging completion
    if (isMultiDragging) {
      setIsMultiDragging(false);
      setDragStartPoint(null);
      
      // Save state after dragging
      if (multiSelectedShapes.length > 0) {
        // Clear multi-selection after dragging is complete
        const updatedShapes = shapes.map(shape => ({
          ...shape,
          multiSelected: false
        }));
        
        setShapes(updatedShapes);
        setMultiSelectedShapes([]);
        
        // Final update for other users
        socket?.emit("shape-update-end", {
          whiteboardId: id,
          instanceId,
          shapes: updatedShapes
        });
        
        saveCanvasState(updatedShapes);
        
        // Add to history
        addToHistory(updatedShapes);
      }
      
      return;
    }
    
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
        
        // Add to history
        addToHistory(shapes);
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
        
        // Add to history
        addToHistory(shapes);
      }
      
      return;
    }
    
    // Handle eraser end
    if (isDrawing && tool === "eraser") {
      handleEraserEnd();
      setIsDrawing(false);
      setCurrentShape(null);
      
      // Add to history after erasing
      addToHistory(shapes);
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
    
    // Add to history
    addToHistory(updatedShapes);
  }, [id, instanceId, isDrawing, currentShape, socket, isDragging, shapes, saveCanvasState, selectedShape, dragStartPoint, isResizing, tool, handleEraserEnd, addToHistory, isAreaSelecting, selectionBox, getShapeBounds, isMultiDragging, multiSelectedShapes])

  // Clear canvas
  const clearCanvas = useCallback(() => {
    // Add current state to history before clearing
    addToHistory(shapes);
    
    setShapes([])
    socket?.emit("clear-canvas", {
      whiteboardId: id,
      instanceId,
    })
    
    // Save empty canvas state to database
    saveCanvasState([]);
    
    // Add empty state to history
    addToHistory([]);
  }, [id, instanceId, socket, saveCanvasState, shapes, addToHistory]);

  // Handle text editor changes
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeTextEditor) return;
    
    const updatedShapes = shapes.map(shape => {
      if (shape.id === activeTextEditor.id) {
        return {
          ...shape,
          text: e.target.value,
          textWidth: textEditorSize.width,
          textHeight: textEditorSize.height
        };
      }
      return shape;
    });
    
    setShapes(updatedShapes);
    setActiveTextEditor({
      ...activeTextEditor,
      text: e.target.value,
      textWidth: textEditorSize.width,
      textHeight: textEditorSize.height
    });
    
    // Real-time sync of text changes
    socket?.emit("shape-update", {
      whiteboardId: id,
      instanceId,
      shape: {
        ...activeTextEditor,
        text: e.target.value,
        textWidth: textEditorSize.width,
        textHeight: textEditorSize.height
      },
      shapes: updatedShapes
    });
  }, [activeTextEditor, id, instanceId, shapes, socket, textEditorSize]);

  // Handle text editor resize
  const handleTextEditorResize = useCallback((width: number, height: number) => {
    if (!activeTextEditor) return;
    
    setTextEditorSize({ width, height });
    
    const updatedShapes = shapes.map(shape => {
      if (shape.id === activeTextEditor.id) {
        return {
          ...shape,
          textWidth: width,
          textHeight: height
        };
      }
      return shape;
    });
    
    setShapes(updatedShapes);
    setActiveTextEditor({
      ...activeTextEditor,
      textWidth: width,
      textHeight: height
    });
    
    // Real-time sync of text changes
    socket?.emit("shape-update", {
      whiteboardId: id,
      instanceId,
      shape: {
        ...activeTextEditor,
        textWidth: width,
        textHeight: height
      },
      shapes: updatedShapes
    });
  }, [activeTextEditor, id, instanceId, shapes, socket]);

  // Handle text editor blur (finish editing)
  const handleTextBlur = useCallback(() => {
    if (!activeTextEditor || isResizingTextEditor) return;
    
    // Only save if there's actual text content
    if (activeTextEditor.text && activeTextEditor.text.trim() !== "") {
      const updatedShapes = shapes.map(shape => {
        if (shape.id === activeTextEditor.id) {
          return {
            ...shape,
            isEditing: false,
            textWidth: textEditorSize.width,
            textHeight: textEditorSize.height
          };
        }
        return shape;
      });
      
      setShapes(updatedShapes);
      
      // Emit socket event for shape update
      socket?.emit("shape-update-end", {
        whiteboardId: id,
        instanceId,
        shapes: updatedShapes
      });
      
      // Save canvas state
      saveCanvasState(updatedShapes);
      
      // Add to history
      addToHistory(updatedShapes);
    } else {
      // Remove empty text shapes
      const updatedShapes = shapes.filter(shape => 
        shape.id !== activeTextEditor.id
      );
      
      setShapes(updatedShapes);
      
      // Emit socket event for shape update
      socket?.emit("shape-update-end", {
        whiteboardId: id,
        instanceId,
        shapes: updatedShapes
      });
      
      // Save canvas state
      saveCanvasState(updatedShapes);
      
      // Add to history
      addToHistory(updatedShapes);
    }
    
    setActiveTextEditor(null);
  }, [activeTextEditor, id, instanceId, saveCanvasState, shapes, socket, textEditorSize, isResizingTextEditor, addToHistory]);

  // Handle copy operation
  const handleCopy = useCallback(() => {
    if (isReadOnly) return;
    
    // Copy selected shape
    if (selectedShape) {
      setClipboardShapes([selectedShape]);
      console.log("Copied 1 shape to clipboard");
      return;
    }
    
    // Copy multi-selected shapes
    if (multiSelectedShapes.length > 0) {
      setClipboardShapes([...multiSelectedShapes]);
      console.log(`Copied ${multiSelectedShapes.length} shapes to clipboard`);
    }
  }, [selectedShape, multiSelectedShapes, isReadOnly]);
  
  // Handle paste operation
  const handlePaste = useCallback(() => {
    if (isReadOnly || !cursorPosition || clipboardShapes.length === 0) return;
    
    // Calculate the bounding box of the clipboard shapes to find their center
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    clipboardShapes.forEach(shape => {
      const bounds = getShapeBounds(shape);
      minX = Math.min(minX, bounds.x1);
      minY = Math.min(minY, bounds.y1);
      maxX = Math.max(maxX, bounds.x2);
      maxY = Math.max(maxY, bounds.y2);
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate offset from center to cursor position
    const offsetX = cursorPosition.x - centerX;
    const offsetY = cursorPosition.y - centerY;
    
    // Create new shapes with new IDs and positions
    const newShapes = clipboardShapes.map(shape => {
      // Create new points with offset
      const newPoints = shape.points.map(point => ({
        x: point.x + offsetX,
        y: point.y + offsetY
      }));
      
      // Create new shape with new ID and points
      return {
        ...shape,
        id: nanoid(),
        points: newPoints,
        selected: false,
        multiSelected: false,
        isEditing: false
      };
    });
    
    // Add new shapes to canvas
    const updatedShapes = [...shapes, ...newShapes];
    setShapes(updatedShapes);
    
    // Emit socket event for shape update
    socket?.emit("shape-update-end", {
      whiteboardId: id,
      instanceId,
      shapes: updatedShapes
    });
    
    // Save canvas state
    saveCanvasState(updatedShapes);
    
    // Add to history
    addToHistory(updatedShapes);
    
    console.log(`Pasted ${newShapes.length} shapes at cursor position`);
  }, [clipboardShapes, cursorPosition, shapes, id, instanceId, socket, saveCanvasState, addToHistory, isReadOnly, getShapeBounds]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if we're editing text
    if (activeTextEditor) return;
    
    // Copy: Ctrl+C
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      handleCopy();
    }
    
    // Paste: Ctrl+V
    if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      handlePaste();
    }
    
    // Delete: Delete key
    if (e.key === 'Delete') {
      e.preventDefault();
      
      // Delete selected shape
      if (selectedShape) {
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
        
        // Add to history
        addToHistory(updatedShapes);
      }
      
      // Delete multi-selected shapes
      if (multiSelectedShapes.length > 0) {
        const updatedShapes = shapes.filter(shape => !shape.multiSelected);
        setShapes(updatedShapes);
        setMultiSelectedShapes([]);
        
        // Emit socket event for shape update
        socket?.emit("shape-update-end", {
          whiteboardId: id,
          instanceId,
          shapes: updatedShapes
        });
        
        // Save canvas state
        saveCanvasState(updatedShapes);
        
        // Add to history
        addToHistory(updatedShapes);
      }
    }
  }, [activeTextEditor, handleCopy, handlePaste, id, instanceId, multiSelectedShapes, saveCanvasState, selectedShape, shapes, socket, addToHistory]);

  // Handle double click event
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isReadOnly) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - panOffset.x;
      const y = e.clientY - rect.top - panOffset.y;
      
      // Check if double-clicked on an existing text shape
      const clickedShape = shapes.find(shape => {
        if (shape.tool === "text" && shape.points.length > 0) {
          const bounds = getShapeBounds(shape);
          return (
            x >= bounds.x1 &&
            x <= bounds.x2 &&
            y >= bounds.y1 &&
            y <= bounds.y2
          );
        }
        return false;
      });
      
      if (clickedShape) {
        // Edit existing text directly on canvas
        const updatedShapes = shapes.map(shape => {
          if (shape.id === clickedShape.id) {
            return {
              ...shape,
              isEditing: true,
              selected: true
            };
          }
          return {
            ...shape,
            isEditing: false,
            selected: shape.id === clickedShape.id
          };
        });
        
        setShapes(updatedShapes);
        
        // Set text editor size based on shape's textWidth and textHeight
        if (clickedShape.textWidth && clickedShape.textHeight) {
          setTextEditorSize({
            width: clickedShape.textWidth,
            height: clickedShape.textHeight
          });
        } else {
          // Default size if not set
          setTextEditorSize({ width: 300, height: 150 });
        }
        
        setActiveTextEditor(clickedShape);
        
        // Focus the text editor in the next render cycle
        setTimeout(() => {
          if (textEditorRef.current) {
            textEditorRef.current.focus();
          }
        }, 0);
      } else {
        // Create new text box directly on canvas
        const fontSize = width * 10; // Larger font size (increased from 5 to 10)
        const newShape: Shape = {
          id: nanoid(),
          tool: "text",
          points: [{ x, y }],
          color,
          width,
          fontSize,
          text: "",
          isEditing: true,
          selected: true,
          textWidth: 300,
          textHeight: 150
        };
        
        const updatedShapes = shapes.map(s => ({
          ...s,
          selected: false,
          isEditing: false
        }));
        
        setShapes([...updatedShapes, newShape]);
        setTextEditorSize({ width: 300, height: 150 });
        setActiveTextEditor(newShape);
        
        // Focus the text editor in the next render cycle
        setTimeout(() => {
          if (textEditorRef.current) {
            textEditorRef.current.focus();
          }
        }, 0);
      }
    },
    [getShapeBounds, isReadOnly, panOffset, shapes, color, width]
  );

  // Handle pointer down event
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isReadOnly || !currentUser) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left - panOffset.x
      const y = e.clientY - rect.top - panOffset.y

      // If text tool is selected, create a text box
      if (tool === "text") {
        const fontSize = width * 10; // Larger font size (increased from 5 to 10)
        const newShape: Shape = {
          id: nanoid(),
          tool: "text",
          points: [{ x, y }],
          color,
          width,
          fontSize,
          text: "",
          isEditing: true,
          selected: true,
          textWidth: 300,
          textHeight: 150
        };
        
        const updatedShapes = shapes.map(s => ({
          ...s,
          selected: false,
          isEditing: false
        }));
        
        setShapes([...updatedShapes, newShape]);
        setTextEditorSize({ width: 300, height: 150 });
        setActiveTextEditor(newShape);
        
        // Focus the text editor in the next render cycle
        setTimeout(() => {
          if (textEditorRef.current) {
            textEditorRef.current.focus();
          }
        }, 0);
        
        return;
      }
      
      // If we have an active text editor, finish editing when clicking elsewhere
      if (activeTextEditor && !isResizingTextEditor) {
        // Use a small timeout to ensure the click event doesn't immediately trigger blur and then another action
        setTimeout(() => {
          handleTextBlur();
        }, 10);
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
      
      // Handle area selection tool
      if (tool === "area-select") {
        // Start area selection
        setIsAreaSelecting(true);
        setSelectionBox({
          start: { x, y },
          end: { x, y }
        });
        
        // Clear any existing selections
        setSelectedShape(null);
        setMultiSelectedShapes([]);
        
        const updatedShapes = shapes.map(s => ({ 
          ...s, 
          selected: false,
          multiSelected: false 
        }));
        
        setShapes(updatedShapes);
        
        return;
      }
      
      // Check if we're clicking on a multi-selected shape to drag all selected shapes
      if (tool === "select") {
        // Find if we're clicking on a multi-selected shape
        const clickedMultiSelectedShape = [...shapes].reverse().find(shape => {
          if (shape.multiSelected) {
            const bounds = getShapeBounds(shape);
            return (
              x >= bounds.x1 &&
              x <= bounds.x2 &&
              y >= bounds.y1 &&
              y <= bounds.y2
            );
          }
          return false;
        });
        
        if (clickedMultiSelectedShape && multiSelectedShapes.length > 0) {
          // Start dragging all multi-selected shapes
          setIsMultiDragging(true);
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
          
          // Mark the shape as selected in the shapes array and clear any multi-selections
          const updatedShapes = shapes.map(s => ({
            ...s,
            selected: s.id === clickedShape.id,
            multiSelected: false // Clear all multi-selections when selecting a single shape
          }));
          
          setShapes(updatedShapes);
          setMultiSelectedShapes([]); // Clear multi-selected shapes array
          
          // Emit socket event to notify other users about selection
          socket?.emit("shape-update", {
            whiteboardId: id,
            instanceId,
            shape: clickedShape,
            shapes: updatedShapes
          });
          
          // Start dragging the shape
          setIsDragging(true);
          setDragStartPoint({ x, y });
          return;
        } else {
          // Deselect if clicking on empty space
          setSelectedShape(null);
          const updatedShapes = shapes.map(s => ({ 
            ...s, 
            selected: false,
            multiSelected: false // Also clear multi-selections
          }));
          setShapes(updatedShapes);
          setMultiSelectedShapes([]); // Clear multi-selected shapes array
          
          // Emit socket event to notify other users about deselection
          socket?.emit("shape-update", {
            whiteboardId: id,
            instanceId,
            shape: null,
            shapes: updatedShapes
          });
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
        ...(tool === "curved-arrow" ? {
          controlPoint: {
            x: x,
            y: y - 50 // Default offset upward
          }
        } : {})
      }

      setCurrentShape(newShape)

      socket?.emit("draw-start", {
        whiteboardId: id,
        instanceId,
        shape: newShape,
      })
    },
    [id, instanceId, tool, color, width, isReadOnly, currentUser, socket, shapes, selectedShape, getResizeHandle, getShapeBounds, panOffset, handleEraserMove, activeTextEditor, handleTextBlur, isResizingTextEditor, multiSelectedShapes]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left - panOffset.x
      const y = e.clientY - rect.top - panOffset.y
      
      // Track cursor position for paste functionality
      setCursorPosition({ x, y })

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

      // Handle area selection
      if (isAreaSelecting && selectionBox) {
        // Update the selection box end point
        setSelectionBox({
          ...selectionBox,
          end: { x, y }
        });
        return;
      }
      
      // Handle multi-selection dragging
      if (isMultiDragging && dragStartPoint && multiSelectedShapes.length > 0) {
        const dx = x - dragStartPoint.x;
        const dy = y - dragStartPoint.y;
        
        // Update all multi-selected shapes
        const updatedShapes = shapes.map(shape => {
          if (shape.multiSelected) {
            // Create new points array with updated positions
            const newPoints = shape.points.map(point => ({
              x: point.x + dx,
              y: point.y + dy
            }));
            
            // If it's a curved arrow, also update the control point
            if (shape.tool === "curved-arrow" && shape.controlPoint) {
              return {
                ...shape,
                points: newPoints,
                controlPoint: {
                  x: shape.controlPoint.x + dx,
                  y: shape.controlPoint.y + dy
                }
              };
            }
            
            return {
              ...shape,
              points: newPoints
            };
          }
          return shape;
        });
        
        setShapes(updatedShapes);
        
        // Update multi-selected shapes
        const updatedMultiSelectedShapes = updatedShapes.filter(s => s.multiSelected);
        setMultiSelectedShapes(updatedMultiSelectedShapes);
        
        // Emit socket event for shape update
        socket?.emit("shape-update", {
          whiteboardId: id,
          instanceId,
          shape: null,
          shapes: updatedShapes
        });
        
        // Update drag start point
        setDragStartPoint({ x, y });
        return;
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
            
            // If it's a curved arrow, also update the control point
            if (shape.tool === "curved-arrow" && shape.controlPoint) {
              return {
                ...shape,
                points: newPoints,
                controlPoint: {
                  x: shape.controlPoint.x + dx,
                  y: shape.controlPoint.y + dy
                }
              };
            }
            
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
      if (tool === "rectangle" || tool === "circle" || tool === "diamond" || tool === "arrow" || tool === "curved-arrow") {
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
    [id, instanceId, isDrawing, currentShape, isReadOnly, currentUser, socket, isDragging, startPanPoint, panOffset, tool, dragStartPoint, selectedShape, shapes, isResizing, resizeHandle, resizeShape, handleEraserMove, activeTextEditor, isResizingTextEditor, isAreaSelecting, selectionBox, isMultiDragging, multiSelectedShapes]
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

    socket.on("draw-started", ({ instanceId: remoteId, shape }: { instanceId: string, shape: Shape }) => {
      if (remoteId !== instanceId) {
        console.log("Remote draw started:", shape);
        // For remote drawing, we need to add the shape to our temporary drawing state
        setCurrentShape(shape);
        drawShape(shape);
      }
    })

    socket.on("draw-progressed", ({ instanceId: remoteId, shape }: { instanceId: string, shape: Shape }) => {
      if (remoteId !== instanceId) {
        console.log("Remote draw progressed:", shape);
        // Update the current shape for remote drawing
        setCurrentShape(shape);
        // Force redraw
        redrawCanvas();
      }
    })

    socket.on("draw-ended", ({ instanceId: remoteId, shape }: { instanceId: string, shape: Shape }) => {
      if (remoteId !== instanceId) {
        console.log("Remote draw ended:", shape);
        setCurrentShape(null);
        
        // Handle text shapes specially to ensure text property is preserved
        if (shape.tool === "text") {
          console.log("Remote text shape created:", shape.text);
        }
        
        setShapes((prev) => {
          const updatedShapes = [...prev, shape];
          // Save canvas state when receiving remote updates
          saveCanvasState(updatedShapes);
          
          // Add to history
          addToHistory(updatedShapes);
          
          return updatedShapes;
        });
      }
    })
    
    socket.on("shape-updated", ({ instanceId: remoteId, shape, shapes: remoteShapes }: { instanceId: string, shape: Shape | null, shapes: Shape[] }) => {
      if (remoteId !== instanceId) {
        console.log("Remote shape updated:", shape);
        
        // Handle text shapes specially to ensure text property is preserved
        if (shape && shape.tool === "text") {
          console.log("Remote text shape updated:", shape.text);
        }
        
        // Update shapes with the remote shapes
        setShapes(remoteShapes);
        
        // Update selected shape if it's the same as the remote shape
        if (selectedShape && shape && selectedShape.id === shape.id) {
          setSelectedShape(shape);
        } else if (!shape) {
          // If shape is null, it means deselection
          setSelectedShape(null);
        }
        
        // Clear multi-selected shapes if they've been modified by another user
        if (multiSelectedShapes.length > 0) {
          // Check if any of our multi-selected shapes are no longer multi-selected in remote shapes
          const stillMultiSelected = multiSelectedShapes.every(ms => 
            remoteShapes.some(rs => rs.id === ms.id && rs.multiSelected)
          );
          
          if (!stillMultiSelected) {
            setMultiSelectedShapes([]);
          }
        }
        
        // Force redraw
        redrawCanvas();
      }
    })
    
    socket.on("shape-update-ended", ({ instanceId: remoteId, shapes: remoteShapes }: { instanceId: string, shapes: Shape[] }) => {
      if (remoteId !== instanceId) {
        console.log("Remote shape update ended");
        
        // Check if any text shapes were updated
        const textShapes = remoteShapes.filter(shape => shape.tool === "text");
        if (textShapes.length > 0) {
          console.log("Remote text shapes updated:", textShapes.length);
        }
        
        // Update shapes with the final remote shapes
        setShapes(remoteShapes);
        
        // Clear multi-selected shapes if they've been modified by another user
        if (multiSelectedShapes.length > 0) {
          // Check if any of our multi-selected shapes are no longer multi-selected in remote shapes
          const stillMultiSelected = multiSelectedShapes.every(ms => 
            remoteShapes.some(rs => rs.id === ms.id && rs.multiSelected)
          );
          
          if (!stillMultiSelected) {
            setMultiSelectedShapes([]);
          }
        }
        
        // Save canvas state
        saveCanvasState(remoteShapes);
        
        // Force redraw
        redrawCanvas();
      }
    })

    socket.on("eraser-highlighted", ({ instanceId: remoteId, shapesToErase: remoteShapesToErase }: { instanceId: string, shapesToErase: string[] }) => {
      if (remoteId !== instanceId) {
        console.log("Remote eraser highlight:", remoteShapesToErase.length, "shapes");
        // Update shapes to erase with the remote shapes to erase
        setShapesToErase(remoteShapesToErase);
        // Force redraw to show the highlighted shapes
        redrawCanvas();
      }
    })

    socket.on("undo-redo-update", ({ instanceId: remoteId, shapes: remoteShapes }: { instanceId: string, shapes: Shape[] }) => {
      if (remoteId !== instanceId) {
        console.log("Remote undo/redo update received");
        // Update shapes with the remote shapes
        setShapes(remoteShapes);
        
        // Add to history
        const shapesCopy = JSON.parse(JSON.stringify(remoteShapes));
        setHistory(prev => {
          const newHistory = [...prev, shapesCopy];
          // Limit history size
          if (newHistory.length > 50) {
            return newHistory.slice(newHistory.length - 50);
          }
          return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
        
        // Update undo/redo availability
        setCanUndo(true);
        setCanRedo(false);
        
        // Force redraw
        redrawCanvas();
      }
    })

    socket.on("canvas-cleared", ({ instanceId: remoteId }: { instanceId: string }) => {
      if (remoteId !== instanceId) {
        console.log("Remote canvas cleared");
        setShapes([]);
        // Save empty canvas state when canvas is cleared remotely
        saveCanvasState([]);
        
        // Add to history
        setHistory(prev => [...prev, []]);
        setHistoryIndex(prev => prev + 1);
        setCanUndo(true);
        setCanRedo(false);
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
      socket.off("undo-redo-update")
      socket.off("canvas-cleared")
      socket.off("cursor-update")
      socket.off("user-left")
    }
  }, [socket, id, instanceId, currentUser, drawShape, redrawCanvas, saveCanvasState, addToHistory])

  // Redraw canvas when shapes change
  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas, shapes, currentShape, panOffset])

  // Add keyboard event listeners for copy/paste
  useEffect(() => {
    // Skip if read-only
    if (isReadOnly) return;
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, isReadOnly]);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      try {
        // Try to parse the initial data as JSON
        const parsedData = JSON.parse(initialData);
        if (Array.isArray(parsedData)) {
          setShapes(parsedData);
          console.log("Loaded initial data:", parsedData.length, "shapes");
          
          // Initialize history with initial data
          setHistory([parsedData]);
          setHistoryIndex(0);
          setCanUndo(false);
          setCanRedo(false);
        } else {
          console.warn("Initial data is not an array:", parsedData);
        }
      } catch (error) {
        console.error("Failed to parse initial data:", error);
        // If parsing fails, initialize with empty array
        setShapes([]);
        setHistory([[]]);
        setHistoryIndex(0);
      }
    } else {
      // If no initial data, initialize with empty array
      setShapes([]);
      setHistory([[]]);
      setHistoryIndex(0);
      console.log("No initial data provided, starting with empty canvas");
    }
  }, [initialData]);

  // Add multi-selection UI
  useEffect(() => {
    // If we have multi-selected shapes, show a floating UI
    if (multiSelectedShapes.length > 0) {
      // Calculate the bounding box of all selected shapes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      multiSelectedShapes.forEach(shape => {
        const bounds = getShapeBounds(shape);
        minX = Math.min(minX, bounds.x1);
        minY = Math.min(minY, bounds.y1);
        maxX = Math.max(maxX, bounds.x2);
        maxY = Math.max(maxY, bounds.y2);
      });
      
      // Create a floating UI element
      const uiElement = document.createElement('div');
      uiElement.id = 'multi-selection-ui';
      uiElement.className = 'absolute bg-zinc-800/90 text-white text-sm px-3 py-2 rounded-md shadow-lg backdrop-blur z-20 flex items-center gap-2';
      uiElement.style.left = `${minX + panOffset.x}px`;
      uiElement.style.top = `${minY + panOffset.y - 40}px`; // Position above the selection
      
      // Add count of selected shapes
      const countSpan = document.createElement('span');
      countSpan.textContent = `${multiSelectedShapes.length} shapes selected`;
      uiElement.appendChild(countSpan);
      
      // Add copy button
      const copyButton = document.createElement('button');
      copyButton.className = 'bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs font-medium transition-colors ml-2 flex items-center gap-1';
      copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        </svg>
        Copy
      `;
      copyButton.onclick = handleCopy;
      uiElement.appendChild(copyButton);
      
      // Add delete button
      const deleteButton = document.createElement('button');
      deleteButton.className = 'bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded text-xs font-medium transition-colors ml-2 flex items-center gap-1';
      deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
        Delete
      `;
      deleteButton.onclick = () => {
        // Remove all multi-selected shapes
        const updatedShapes = shapes.filter(shape => !shape.multiSelected);
        
        setShapes(updatedShapes);
        setMultiSelectedShapes([]);
        
        // Emit socket event for shape update
        socket?.emit("shape-update-end", {
          whiteboardId: id,
          instanceId,
          shapes: updatedShapes
        });
        
        // Save canvas state
        saveCanvasState(updatedShapes);
        
        // Add to history
        addToHistory(updatedShapes);
      };
      uiElement.appendChild(deleteButton);
      
      // Add to the DOM
      document.querySelector('.relative.h-full.w-full')?.appendChild(uiElement);
      
      // Clean up
      return () => {
        document.getElementById('multi-selection-ui')?.remove();
      };
    }
  }, [multiSelectedShapes, getShapeBounds, panOffset, shapes, id, instanceId, socket, saveCanvasState, addToHistory, handleCopy]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-900">
      <WhiteboardToolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        width={width}
        setWidth={setWidth}
        isReadOnly={isReadOnly}
        onClear={clearCanvas}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      
      {/* Copy/Paste Status Indicator */}
      {clipboardShapes.length > 0 && (
        <div className="absolute left-4 bottom-4 bg-zinc-800/90 text-white text-sm px-3 py-1.5 rounded-md shadow-lg backdrop-blur z-10 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          </svg>
          <span>{clipboardShapes.length} {clipboardShapes.length === 1 ? 'shape' : 'shapes'} copied</span>
          <span className="text-xs text-zinc-400 ml-1">(Ctrl+V to paste)</span>
        </div>
      )}
      
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
                const updatedShapes = shapes.map(s => ({ ...s, selected: false }));
                setShapes(updatedShapes);
                
                // Emit socket event to notify other users about deselection
                socket?.emit("shape-update-end", {
                  whiteboardId: id,
                  instanceId,
                  shapes: updatedShapes
                });
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
                        width: newWidth,
                        // Update fontSize for text shapes when width changes
                        ...(shape.tool === "text" ? { fontSize: newWidth * 10 } : {})
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
          
          {/* Font size control for text shapes */}
          {selectedShape.tool === "text" && (
            <div className="mb-2">
              <label className="text-xs text-zinc-400 mb-1 block">Font Size: {selectedShape.fontSize || selectedShape.width * 10}px</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={selectedShape.fontSize || selectedShape.width * 10}
                  onChange={(e) => {
                    const newFontSize = parseInt(e.target.value);
                    
                    // Update the selected shape's font size
                    const updatedShapes = shapes.map(shape => {
                      if (shape.id === selectedShape.id) {
                        return {
                          ...shape,
                          fontSize: newFontSize
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
                <div className="text-xs font-mono bg-zinc-700 px-2 py-1 rounded">
                  {selectedShape.fontSize || selectedShape.width * 10}
                </div>
              </div>
            </div>
          )}
          
          {/* Edit text button for text shapes */}
          {selectedShape.tool === "text" && (
            <button
              className="mt-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-3 rounded text-xs font-medium transition-colors"
              onClick={() => {
                // Set the shape to editing mode
                const updatedShapes = shapes.map(shape => {
                  if (shape.id === selectedShape.id) {
                    return {
                      ...shape,
                      isEditing: true
                    };
                  }
                  return {
                    ...shape,
                    isEditing: false
                  };
                });
                
                setShapes(updatedShapes);
                
                // Set active text editor
                setActiveTextEditor(selectedShape);
                
                // Set text editor size based on shape's textWidth and textHeight
                if (selectedShape.textWidth && selectedShape.textHeight) {
                  setTextEditorSize({
                    width: selectedShape.textWidth,
                    height: selectedShape.textHeight
                  });
                } else {
                  // Default size if not set
                  setTextEditorSize({ width: 300, height: 150 });
                }
                
                // Focus the text editor in the next render cycle
                setTimeout(() => {
                  if (textEditorRef.current) {
                    textEditorRef.current.focus();
                  }
                }, 0);
              }}
            >
              Edit Text
            </button>
          )}
          
          {/* Resize button for text shapes */}
          {selectedShape.tool === "text" && (
            <button
              className="mt-1 bg-green-500 hover:bg-green-600 text-white py-1.5 px-3 rounded text-xs font-medium transition-colors"
              onClick={() => {
                // Set the shape to editing mode with resize focus
                const updatedShapes = shapes.map(shape => {
                  if (shape.id === selectedShape.id) {
                    return {
                      ...shape,
                      isEditing: true
                    };
                  }
                  return {
                    ...shape,
                    isEditing: false
                  };
                });
                
                setShapes(updatedShapes);
                
                // Set active text editor
                setActiveTextEditor(selectedShape);
                
                // Set text editor size based on shape's textWidth and textHeight
                if (selectedShape.textWidth && selectedShape.textHeight) {
                  setTextEditorSize({
                    width: selectedShape.textWidth,
                    height: selectedShape.textHeight
                  });
                } else {
                  // Default size if not set
                  setTextEditorSize({ width: 300, height: 150 });
                }
                
                // Set resize mode
                setIsResizingTextEditor(true);
                
                // Focus the text editor in the next render cycle
                setTimeout(() => {
                  if (textEditorRef.current) {
                    textEditorRef.current.focus();
                  }
                }, 0);
              }}
            >
              Resize Text Box
            </button>
          )}
          
          {/* Delete button */}
          <div className="flex gap-2 mt-1">
            <button
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
              onClick={handleCopy}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              </svg>
              Copy
            </button>
            
            <button
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1.5 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
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
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
      
      {/* Text editor overlay */}
      {activeTextEditor && (
        <div 
          ref={textEditorContainerRef}
          className="absolute"
          style={{
            left: `${activeTextEditor.points[0].x + panOffset.x}px`,
            top: `${activeTextEditor.points[0].y + panOffset.y}px`,
            zIndex: 100,
            width: `${textEditorSize.width}px`,
            height: `${textEditorSize.height}px`
          }}
        >
          <div className="relative w-full h-full flex flex-col">
            <Textarea
              ref={textEditorRef}
              value={activeTextEditor.text || ""}
              onChange={handleTextChange}
              onBlur={() => {
                // Add a longer delay to prevent accidental blur when clicking resize handle
                setTimeout(() => {
                  if (!isResizingTextEditor) {
                    handleTextBlur();
                  }
                }, 200);
              }}
              className="bg-transparent text-current border border-primary resize-none overflow-auto w-full h-full p-2 focus:ring-2 focus:ring-primary whitespace-pre-wrap"
              style={{
                color: activeTextEditor.color,
                fontSize: `${activeTextEditor.fontSize || activeTextEditor.width * 10}px`,
                fontFamily: "'Segoe Print', 'Comic Sans MS', cursive",
                lineHeight: "1.2",
              }}
              placeholder="Type here..."
              autoFocus
              wrap="hard"
            />
            
            {/* Resize handles */}
            <div 
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary cursor-nwse-resize rounded-bl-md flex items-center justify-center"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsResizingTextEditor(true);
                
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = textEditorSize.width;
                const startHeight = textEditorSize.height;
                
                const handlePointerMove = (moveEvent: PointerEvent) => {
                  moveEvent.preventDefault();
                  moveEvent.stopPropagation();
                  
                  const dx = moveEvent.clientX - startX;
                  const dy = moveEvent.clientY - startY;
                  
                  const newWidth = Math.max(100, startWidth + dx);
                  const newHeight = Math.max(40, startHeight + dy);
                  
                  handleTextEditorResize(newWidth, newHeight);
                };
                
                const handlePointerUp = (upEvent: PointerEvent) => {
                  upEvent.preventDefault();
                  upEvent.stopPropagation();
                  
                  document.removeEventListener('pointermove', handlePointerMove);
                  document.removeEventListener('pointerup', handlePointerUp);
                  
                  // Add a small delay before turning off resize mode to prevent accidental blur
                  setTimeout(() => {
                    setIsResizingTextEditor(false);
                  }, 200);
                };
                
                document.addEventListener('pointermove', handlePointerMove);
                document.addEventListener('pointerup', handlePointerUp);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </div>
          </div>
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
          tool === "area-select" && "cursor-crosshair",
          isResizing && "cursor-nwse-resize",
          tool === "text" && "cursor-text"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />
      {Object.entries(cursors).map(([clientId, cursor]) => (
        <UserCursor key={clientId} x={cursor.x} y={cursor.y} name={cursor.user.name} />
      ))}
    </div>
  )
}

