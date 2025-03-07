"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useSocket } from "@/hooks/use-socket-deploy"
import { nanoid } from "nanoid"
import { useTheme } from "next-themes"
import { WhiteboardToolbar } from "./whiteboard-toolbar"
import { UserCursor } from "./user-cursor"
import { cn } from "@/lib/utils"
import axios from "axios"
import { Textarea } from "@/components/ui/textarea"
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { jsPDF } from "jspdf"
import { TbLineDashed , TbLineDotted  } from "react-icons/tb"
import { FaMinus, FaPlus  } from "react-icons/fa"
import { ChevronDown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useWhiteboardUpdates } from "@/components/providers/whiteboard-provider"

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
  strokeStyle?: string  // For solid, dashed, or dotted lines
  fillStyle?: string    // For transparent or solid fill
  fillOpacity?: number  // For solid fill opacity (0-1)
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
  onExportClick?: () => void
  showExportInToolbar?: boolean
  onClipboardChange?: (count: number, clearFn: () => void) => void
}

const strokeStyles = [
  { id: "solid", label: "Solid", Icon: FaMinus },
  { id: "dashed", label: "Dashed", Icon: TbLineDashed },
  { id: "dotted", label: "Dotted", Icon: TbLineDotted },
]

export function WhiteboardEditor({ 
  id, 
  initialData, 
  isReadOnly, 
  currentUser, 
  onExportClick,
  showExportInToolbar = true,
  onClipboardChange
}: WhiteboardEditorProps) {
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
  const [tool, setTool] = useState(isReadOnly? "hand": "pen")
  const [color, setColor] = useState("#FFFFFF") // Default to white for dark mode
  const [width, setWidth] = useState(2)
  const [strokeStyle, setStrokeStyle] = useState("solid") // Default to solid line
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
  const [zoomLevel, setZoomLevel] = useState(1)
  const MIN_ZOOM = 0.1
  const MAX_ZOOM = 5
  
  // Clipboard state for copy/paste
  const [clipboardShapes, setClipboardShapes] = useState<Shape[]>([])
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "pdf">("png");
  const [exportFileName, setExportFileName] = useState("whiteboard-export");
  const [isExporting, setIsExporting] = useState(false);
  const [includeBackground, setIncludeBackground] = useState(true);
  const { toast } = useToast()
  
  const [editingZoom, setEditingZoom] = useState(false);
  const [zoomInput, setZoomInput] = useState("");

  // Add this near the other state declarations
  const [isDesktop, setIsDesktop] = useState(false);

  // Add state for touch events
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null)
  const [touchStartZoom, setTouchStartZoom] = useState<number | null>(null)
  const [isPinching, setIsPinching] = useState(false)
  const [touchStartMidpoint, setTouchStartMidpoint] = useState<Point | null>(null)
  const [showMobileContextMenu, setShowMobileContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState<Point | null>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null)

  const { markWhiteboardsUpdated } = useWhiteboardUpdates()

  // Add this useEffect to handle responsive behavior
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 768); // 768px is the 'md' breakpoint
    };
    
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setZoomInput(value);
  };

  const handleZoomInputBlur = () => {
    const numericValue = parseInt(zoomInput, 10);
    if (!isNaN(numericValue)) {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, numericValue / 100));
      setZoomLevel(newZoom);
    }
    setEditingZoom(false);
  };

  const handleZoomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent propagation to stop keyboard shortcuts from triggering
    e.stopPropagation();
    
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingZoom(false);
    }
  };
  
  // Initialize canvas context
  const getContext = useCallback(() => {
    if (canvasRef.current) {
      return canvasRef.current.getContext("2d")
    }
    return null
  }, [canvasRef])

  // Helper function to convert screen coordinates to canvas coordinates
  const screenToCanvasCoordinates = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: (screenX - rect.left - panOffset.x) / zoomLevel,
      y: (screenY - rect.top - panOffset.y) / zoomLevel
    }
  }, [panOffset, zoomLevel])
  
  const handleZoom = useCallback((delta: number, mouseX: number, mouseY: number) => {
    setZoomLevel(prevZoom => {
      // Calculate new zoom level with smoother delta
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom * zoomFactor));
      
      if (newZoom === prevZoom) return prevZoom; // No change needed if at bounds
      
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return newZoom;

      // Calculate mouse position relative to canvas
      const mousePointX = mouseX - canvasRect.left;
      const mousePointY = mouseY - canvasRect.top;

      // Calculate new pan offset to keep the mouse point fixed
      setPanOffset(prev => ({
        x: mousePointX - ((mousePointX - prev.x) * newZoom) / prevZoom,
        y: mousePointY - ((mousePointY - prev.y) * newZoom) / prevZoom
      }));

      return newZoom;
    });
  }, [canvasRef]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      handleZoom(delta, e.clientX, e.clientY);
    }
  }, [handleZoom]);

  // Add wheel event listener
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false })
      return () => canvas.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

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

    // Save current fillStyle and set it to match strokeStyle
    const currentFillStyle = ctx.fillStyle
    ctx.fillStyle = ctx.strokeStyle

    ctx.beginPath()
    ctx.moveTo(to.x, to.y)
    ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()

    // Restore original fillStyle
    ctx.fillStyle = currentFillStyle
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
    const angle = Math.atan2(to.y - controlPoint.y, to.x - controlPoint.x)
    
    // Save current fillStyle and set it to match strokeStyle
    const currentFillStyle = ctx.fillStyle
    ctx.fillStyle = ctx.strokeStyle
    
    // Draw the arrow head
    ctx.beginPath()
    ctx.moveTo(to.x, to.y)
    ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()

    // Restore original fillStyle
    ctx.fillStyle = currentFillStyle
    
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
      ctx.lineWidth = shape.width
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      // Apply stroke style if specified
      if (shape.strokeStyle) {
        switch (shape.strokeStyle) {
          case "dashed":
            ctx.setLineDash([10, 5]);
            break;
          case "dotted":
            ctx.setLineDash([2, 4]);
            break;
          case "solid":
          default:
            ctx.setLineDash([]);
            break;
        }
      } else {
        ctx.setLineDash([]);
      }

      if (shape.transform) {
        ctx.translate(shape.transform.x, shape.transform.y)
        ctx.scale(shape.transform.scale, shape.transform.scale)
        ctx.rotate(shape.transform.rotate)
      }

      switch (shape.tool) {
        case "rectangle":
          if (shape.points.length >= 2) {
            const start = shape.points[0];
            const end = shape.points[shape.points.length - 1];
            const width = end.x - start.x;
            const height = end.y - start.y;
            
            ctx.beginPath();
            ctx.rect(start.x, start.y, width, height);
            
            // Handle fill if specified
            if (shape.fillStyle === "solid") {
              ctx.fillStyle = shape.color;
              const currentAlpha = ctx.globalAlpha;
              ctx.globalAlpha = currentAlpha * (shape.fillOpacity || 0.5);
              ctx.fill();
              ctx.globalAlpha = currentAlpha;
            }
            
            ctx.stroke();
          }
          break;

        case "diamond":
          if (shape.points.length >= 2) {
            const start = shape.points[0];
            const end = shape.points[shape.points.length - 1];
            const width = end.x - start.x;
            const height = end.y - start.y;
            
            ctx.beginPath();
            ctx.moveTo(start.x + width/2, start.y); // Top point
            ctx.lineTo(start.x + width, start.y + height/2); // Right point
            ctx.lineTo(start.x + width/2, start.y + height); // Bottom point
            ctx.lineTo(start.x, start.y + height/2); // Left point
            ctx.closePath();
            
            // Handle fill if specified
            if (shape.fillStyle === "solid") {
              ctx.fillStyle = shape.color;
              const currentAlpha = ctx.globalAlpha;
              ctx.globalAlpha = currentAlpha * (shape.fillOpacity || 0.5);
              ctx.fill();
              ctx.globalAlpha = currentAlpha;
            }
            
            ctx.stroke();
          }
          break;

        case "circle":
          if (shape.points.length >= 2) {
            const start = shape.points[0];
            const end = shape.points[shape.points.length - 1];
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            ctx.beginPath();
            ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
            
            // Handle fill if specified
            if (shape.fillStyle === "solid") {
              ctx.fillStyle = shape.color;
              const currentAlpha = ctx.globalAlpha;
              ctx.globalAlpha = currentAlpha * (shape.fillOpacity || 0.5);
              ctx.fill();
              ctx.globalAlpha = currentAlpha;
            }
            
            ctx.stroke();
          }
          break;

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

        case "text":
          if (shape.points.length > 0 && shape.text) {
            const point = shape.points[0];
            const fontSize = shape.fontSize || shape.width * 10;
            
            // Use a handwriting-like font
            ctx.font = `${fontSize}px 'Segoe Print', 'Comic Sans MS', cursive`;
            ctx.textBaseline = "top";
            ctx.fillStyle = shape.color;
            
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

      // Reset line dash before drawing selection indicators
      ctx.setLineDash([])

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
      case "pen":
        // For pen drawings, we need to scale all points relative to the shape's center
        const bounds = getShapeBounds(shape);
        const centerX = (bounds.x1 + bounds.x2) / 2;
        const centerY = (bounds.y1 + bounds.y2) / 2;
        
        // Calculate scale factors based on the handle and movement
        let scaleX = 1;
        let scaleY = 1;
        
        switch (handle) {
          case "tl":
            scaleX = (bounds.x2 - bounds.x1 - dx) / (bounds.x2 - bounds.x1);
            scaleY = (bounds.y2 - bounds.y1 - dy) / (bounds.y2 - bounds.y1);
            break;
          case "tr":
            scaleX = (bounds.x2 - bounds.x1 + dx) / (bounds.x2 - bounds.x1);
            scaleY = (bounds.y2 - bounds.y1 - dy) / (bounds.y2 - bounds.y1);
            break;
          case "bl":
            scaleX = (bounds.x2 - bounds.x1 - dx) / (bounds.x2 - bounds.x1);
            scaleY = (bounds.y2 - bounds.y1 + dy) / (bounds.y2 - bounds.y1);
            break;
          case "br":
            scaleX = (bounds.x2 - bounds.x1 + dx) / (bounds.x2 - bounds.x1);
            scaleY = (bounds.y2 - bounds.y1 + dy) / (bounds.y2 - bounds.y1);
            break;
        }
        
        // Apply scaling to all points
        newPoints.forEach(point => {
          const relativeX = point.x - centerX;
          const relativeY = point.y - centerY;
          point.x = centerX + relativeX * scaleX;
          point.y = centerY + relativeY * scaleY;
        });
        break;
        
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
    ctx.scale(zoomLevel, zoomLevel)

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
  }, [getContext, drawShape, shapes, currentShape, panOffset, selectionBox, drawSelectionBox, zoomLevel])

  // Save canvas state to database
  const saveCanvasState = useCallback(
    async (shapesToSave: Shape[]) => {
      try {
        await axios.post(`/api/whiteboards/${id}`, {
          content: JSON.stringify(shapesToSave),
        });
        
        // Mark whiteboards as updated after successful save
        markWhiteboardsUpdated();
      } catch (error) {
        console.error("Failed to save whiteboard state:", error);
      }
    },
    [id, markWhiteboardsUpdated]
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
    setSelectedShape(null);
    setMultiSelectedShapes([]);
    
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
      return;
    }
    
    // Copy multi-selected shapes
    if (multiSelectedShapes.length > 0) {
      setClipboardShapes([...multiSelectedShapes]);
    }
  }, [selectedShape, multiSelectedShapes, isReadOnly]);

  // Handle clear clipboard
  const handleClearClipboard = useCallback(() => {
    setClipboardShapes([]);
  }, []);
  
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
    // Skip if we're editing zoom input
    if (editingZoom) return;
    
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        handleZoom(1, window.innerWidth / 2, window.innerHeight / 2);
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoom(-1, window.innerWidth / 2, window.innerHeight / 2);
      } else if (e.key === '0') {
        e.preventDefault();
        setZoomLevel(1); // Reset to 100%
        setPanOffset({ x: 0, y: 0 }); // Reset pan offset
      }
    }

    if(isReadOnly) return;
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
    
    // Clear Clipboard: Ctrl/Cmd+X
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      e.preventDefault();
      handleClearClipboard();
    }
    
    // Select All: Ctrl/Cmd+A
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      
      // Select all shapes
      if (shapes.length > 0) {
        // Mark all shapes as multi-selected
        const updatedShapes = shapes.map(shape => ({
          ...shape,
          multiSelected: true
        }));
        
        setShapes(updatedShapes);
        setMultiSelectedShapes(updatedShapes);
        setSelectedShape(null); // Clear single selection
        
        // Save canvas state
        saveCanvasState(updatedShapes);
      }
    }
    
    // Undo: Ctrl/Cmd+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    }
    
    // Redo: Ctrl/Cmd+R
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      handleRedo();
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

    // Escape key to deselect everything
    if (e.key === 'Escape') {
      e.preventDefault();
      
      // Update all shapes to remove selection indicators
      const updatedShapes = shapes.map(shape => ({
        ...shape,
        selected: false,
        multiSelected: false
      }));
      
      // Clear selection states
      setSelectedShape(null);
      setMultiSelectedShapes([]);
      
      // Update shapes and save canvas state
      setShapes(updatedShapes);
      saveCanvasState(updatedShapes);
      
      // Emit socket event for shape update
      socket?.emit("shape-update-end", {
        whiteboardId: id,
        instanceId,
        shapes: updatedShapes
      });
    }
    
    // Tool shortcuts (only if not using modifier keys)
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !isReadOnly) {
      // v for select tool
      if (e.key === 'v') {
        e.preventDefault();
        setTool('select');
      }
      // p for pen tool
      else if (e.key === 'p') {
        e.preventDefault();
        setTool('pen');
      }
      // e for eraser
      else if (e.key === 'e') {
        e.preventDefault();
        setTool('eraser');
      }
      // h for hand tool
      else if (e.key === 'h') {
        e.preventDefault();
        setTool('hand');
      }
      // a for area select
      else if (e.key === 'a') {
        e.preventDefault();
        setTool('area-select');
      }
      // t for text
      else if (e.key === 't') {
        e.preventDefault();
        setTool('text');
      }
      // x for clear canvas
      else if (e.key === 'x') {
        e.preventDefault();
        clearCanvas();
      }
      // 1 for rectangle
      else if (e.key === '1') {
        e.preventDefault();
        setTool('rectangle');
      }
      // 2 for circle
      else if (e.key === '2') {
        e.preventDefault();
        setTool('circle');
      }
      // 3 for arrow
      else if (e.key === '3') {
        e.preventDefault();
        setTool('arrow');
      }
      // 4 for curved arrow
      else if (e.key === '4') {
        e.preventDefault();
        setTool('curved-arrow');
      }
      // 5 for diamond
      else if (e.key === '5') {
        e.preventDefault();
        setTool('diamond');
      }
    }
  }, [activeTextEditor, handleCopy, handlePaste, handleUndo, handleRedo, id, instanceId, multiSelectedShapes, saveCanvasState, selectedShape, shapes, socket, addToHistory, handleZoom, isReadOnly, clearCanvas, handleClearClipboard, editingZoom]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle double click event
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isReadOnly) return;
      if(document.body.classList.contains("app-stage-2")) return;
      if(tool === "hand" || tool === "area-select" || tool === "eraser") return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      // const x = e.clientX - rect.left - panOffset.x;
      // const y = e.clientY - rect.top - panOffset.y;
      const { x, y } = screenToCanvasCoordinates(e.clientX, e.clientY);
      
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
      // Disable pointer interactions while pinching
      if (isPinching) return;

      // Allow hand tool for all users, but require edit access for other tools
      if ((isReadOnly || !currentUser) && tool !== "hand") return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      // const x = e.clientX - rect.left - panOffset.x
      // const y = e.clientY - rect.top - panOffset.y
      const { x, y } = screenToCanvasCoordinates(e.clientX, e.clientY)

      // Handle panning with hand tool - moved up to be handled first
      if (tool === "hand") {
        setIsDragging(true)
        setStartPanPoint({ x: e.clientX, y: e.clientY })
        return
      }

      // All other tools require edit access
      if (isReadOnly || !currentUser) return

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
        strokeStyle,
        selected: false,
        // Only add fill properties in stage-3
        ...(document.body.classList.contains("app-stage-3") ? {
          fillStyle: "transparent",
          fillOpacity: undefined,
        } : {}),
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
    [id, instanceId, tool, color, width, strokeStyle, isReadOnly, currentUser, socket, shapes, selectedShape, getResizeHandle, getShapeBounds, panOffset, handleEraserMove, activeTextEditor, handleTextBlur, isResizingTextEditor, multiSelectedShapes, isPinching]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Disable pointer interactions while pinching
      if (isPinching) return;

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      // const x = e.clientX - rect.left - panOffset.x
      // const y = e.clientY - rect.top - panOffset.y
      const { x, y } = screenToCanvasCoordinates(e.clientX, e.clientY)
      
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
    [id, instanceId, isDrawing, currentShape, isReadOnly, currentUser, socket, isDragging, startPanPoint, panOffset, tool, dragStartPoint, selectedShape, shapes, isResizing, resizeHandle, resizeShape, handleEraserMove, activeTextEditor, isResizingTextEditor, isAreaSelecting, selectionBox, isMultiDragging, multiSelectedShapes, strokeStyle, isPinching]
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
    
    socket.on("shape-updated", ({ instanceId: remoteId, shape: remoteShape, shapes: remoteShapes }: { instanceId: string, shape: Shape | null, shapes: Shape[] }) => {
      if (remoteId !== instanceId) {
        console.log("Remote shape update");
        
        // Update shapes with the remote shapes
        setShapes(remoteShapes);
        
        // Update selected shape if it was modified
        if (selectedShape && remoteShape && remoteShape.id === selectedShape.id) {
          setSelectedShape(remoteShape);
        }
        
        // Clear selection if the selected shape was deleted
        if (selectedShape && !remoteShapes.some(s => s.id === selectedShape.id)) {
          setSelectedShape(null);
        }
        
        // Save canvas state
        saveCanvasState(remoteShapes);
        
        // Force redraw
        redrawCanvas();
      }
    });
    
    socket.on("shape-update-ended", ({ instanceId: remoteId, shapes: remoteShapes }: { instanceId: string, shapes: Shape[] }) => {
      if (remoteId !== instanceId) {
        console.log("Remote shape update ended");
        
        // Update shapes with the final remote shapes
        setShapes(remoteShapes);
        
        // Update selected shape if it still exists
        if (selectedShape) {
          const updatedSelectedShape = remoteShapes.find(s => s.id === selectedShape.id);
          if (updatedSelectedShape) {
            setSelectedShape(updatedSelectedShape);
          } else {
            setSelectedShape(null);
          }
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
        setSelectedShape(null);
        setMultiSelectedShapes([]);
        
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

  // Function to handle exporting the whiteboard
  const handleExport = useCallback(() => {
    setShowExportDialog(true);
    
    // If onExportClick is provided, call it as well
    if (onExportClick) {
      onExportClick();
    }
  }, [onExportClick]);
  
  // Register the export function with the window object
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__setExportFunction) {
      (window as any).__setExportFunction(handleExport);
    }
  }, [handleExport]);
  
  // Function to perform the actual export
  const performExport = useCallback(async () => {
    if (!canvasRef.current) return;
    
    try {
      setIsExporting(true);
      
      const canvas = canvasRef.current;
      
      // Create a temporary canvas with white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      // Fill with white background
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // If includeBackground is true, draw a grid pattern
      if (includeBackground) {
        // Draw grid pattern
        const gridSize = 25;
        const gridColor = 'rgba(0, 0, 0, 0.1)';
        
        tempCtx.strokeStyle = gridColor;
        tempCtx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= tempCanvas.width; x += gridSize) {
          tempCtx.beginPath();
          tempCtx.moveTo(x, 0);
          tempCtx.lineTo(x, tempCanvas.height);
          tempCtx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= tempCanvas.height; y += gridSize) {
          tempCtx.beginPath();
          tempCtx.moveTo(0, y);
          tempCtx.lineTo(tempCanvas.width, y);
          tempCtx.stroke();
        }
      }
      
      // Draw the original canvas content
      tempCtx.drawImage(canvas, 0, 0);
      
      if (exportFormat === "png") {
        // Export as PNG
        const dataUrl = tempCanvas.toDataURL('image/png');
        
        // Create a download link
        const link = document.createElement('a');
        link.download = `${exportFileName || 'whiteboard-export'}.png`;
        link.href = dataUrl;
        link.click();
      } else if (exportFormat === "pdf") {
        // Export as PDF
        const imgData = tempCanvas.toDataURL('image/png');
        
        // Calculate PDF dimensions (convert pixels to mm at 72 DPI)
        // Add a small margin to ensure content isn't cut off
        const margin = 10; // 10mm margin
        const pdfWidth = (tempCanvas.width * 0.264583) + (margin * 2);
        const pdfHeight = (tempCanvas.height * 0.264583) + (margin * 2);
        
        const pdf = new jsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        });
        
        // Add the image with margins
        pdf.addImage(
          imgData, 
          'PNG', 
          margin, // x position with margin
          margin, // y position with margin
          tempCanvas.width * 0.264583, // width in mm
          tempCanvas.height * 0.264583 // height in mm
        );
        
        pdf.save(`${exportFileName || 'whiteboard-export'}.pdf`);
      }
      
      setShowExportDialog(false);
    } catch (error) {
      console.error("Error exporting whiteboard:", error);
      alert("Failed to export whiteboard. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [canvasRef, exportFormat, exportFileName, includeBackground]);

  // Expose the export function to the parent component if onExportClick is provided
  useEffect(() => {
    if (onExportClick) {
      onExportClick = handleExport;
    }
  }, [onExportClick, handleExport]);

  useEffect(() => {
    if (socket && currentUser) {
      // Join the whiteboard room
      socket.emit("join-whiteboard", {
        whiteboardId: id,
        instanceId,
        user: {
          name: currentUser.name,
          id: currentUser.id,
        },
        canEdit: !isReadOnly,
      })

      // Handle cursor movement - only emit if user has edit access
      const handlePointerMove = (e: PointerEvent) => {
        if (!canvasRef.current || isReadOnly) return

        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        socket.emit("cursor-move", {
          whiteboardId: id,
          instanceId,
          x,
          y,
          user: {
            name: currentUser.name,
            id: currentUser.id,
          },
        })
      }

      canvasRef.current?.addEventListener("pointermove", handlePointerMove)

      return () => {
        canvasRef.current?.removeEventListener("pointermove", handlePointerMove)
        socket.emit("leave-whiteboard", {
          whiteboardId: id,
          instanceId,
        })
      }
    }
  }, [socket, id, instanceId, currentUser, isReadOnly])

  // Update clipboard count whenever it changes
  useEffect(() => {
    onClipboardChange?.(clipboardShapes.length, handleClearClipboard);
  }, [clipboardShapes.length, handleClearClipboard, onClipboardChange]);

  const handleZoomIn = useCallback(() => {
    handleZoom(1, window.innerWidth / 2, window.innerHeight / 2)
    console.log(zoomLevel);
  }, [handleZoom])

  const handleZoomOut = useCallback(() => {
    handleZoom(-1, window.innerWidth / 2, window.innerHeight / 2)
    console.log(zoomLevel);
  }, [handleZoom])

  // Add touch event handlers before the return statement
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Clear any pending long press timer
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      
      // Handle pinch gesture
      e.preventDefault();
      setIsPinching(true);
      
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const midpoint = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
      
      setTouchStartDistance(distance);
      setTouchStartZoom(zoomLevel);
      setTouchStartMidpoint(midpoint);
      
      // Set start pan point for two-finger pan
      setStartPanPoint(midpoint);
      setIsDragging(true);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const { x, y } = screenToCanvasCoordinates(touch.clientX, touch.clientY);
      
      // Store the initial touch position and time
      setDragStartPoint({ x, y });
      setTouchStartTime(Date.now());

      // Find if we're touching a selected shape
      const touchedShape = shapes.find(shape => {
        if (shape.selected || shape.multiSelected) {
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

      // Set up long press timer
      longPressTimeoutRef.current = setTimeout(() => {
        if (tool === "select") {
          if (touchedShape || clipboardShapes.length > 0) {
            // Show context menu for copy/paste
            setContextMenuPosition({ x: touch.clientX, y: touch.clientY });
            setShowMobileContextMenu(true);
          } else {
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
          }
        }
      }, 500);
    }
  }, [
    zoomLevel, shapes, screenToCanvasCoordinates, getShapeBounds,
    clipboardShapes, tool
  ]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      
      // Calculate new distance between touch points
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      // Calculate new midpoint
      const currentMidpoint = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
      
      if (touchStartDistance && touchStartZoom && touchStartMidpoint) {
        // Handle pinch zoom
        const scale = distance / touchStartDistance;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, touchStartZoom * scale));
        setZoomLevel(newZoom);
        
        // Handle two-finger pan
        if (isDragging && startPanPoint) {
          const dx = currentMidpoint.x - startPanPoint.x;
          const dy = currentMidpoint.y - startPanPoint.y;
          setPanOffset(prev => ({
            x: prev.x + dx,
            y: prev.y + dy
          }));
          setStartPanPoint(currentMidpoint);
        }
      }
    } else if (e.touches.length === 1 && !isPinching) {
      const touch = e.touches[0];
      const { x, y } = screenToCanvasCoordinates(touch.clientX, touch.clientY);
      
      // If we have a long press timer and the touch has moved significantly
      if (longPressTimeoutRef.current && touchStartTime && dragStartPoint) {
        const moveThreshold = 10; // pixels
        const dx = x - dragStartPoint.x;
        const dy = y - dragStartPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If moved more than threshold, cancel long press and context menu
        if (distance > moveThreshold) {
          clearTimeout(longPressTimeoutRef.current);
          setShowMobileContextMenu(false);
          setContextMenuPosition(null);
        }
      }
      
      // Update area selection if active
      if (isAreaSelecting && selectionBox) {
        setSelectionBox({
          ...selectionBox,
          end: { x, y }
        });
      }
    }
  }, [
    touchStartDistance, touchStartZoom, touchStartMidpoint, touchStartTime,
    dragStartPoint, isAreaSelecting, selectionBox, isDragging, startPanPoint,
    isPinching, screenToCanvasCoordinates
  ]);

  const handleTouchEnd = useCallback(() => {
    // Clear long press timer
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    
    // Handle area selection completion
    if (isAreaSelecting && selectionBox) {
      const x1 = Math.min(selectionBox.start.x, selectionBox.end.x);
      const y1 = Math.min(selectionBox.start.y, selectionBox.end.y);
      const x2 = Math.max(selectionBox.start.x, selectionBox.end.x);
      const y2 = Math.max(selectionBox.start.y, selectionBox.end.y);
      
      const selectedShapes = shapes.filter(shape => {
        const bounds = getShapeBounds(shape);
        return (
          bounds.x2 >= x1 && 
          bounds.x1 <= x2 && 
          bounds.y2 >= y1 && 
          bounds.y1 <= y2
        );
      });
      
      if (selectedShapes.length > 0) {
        const updatedShapes = shapes.map(shape => ({
          ...shape,
          selected: false,
          multiSelected: selectedShapes.some(s => s.id === shape.id)
        }));
        
        setShapes(updatedShapes);
        setMultiSelectedShapes(selectedShapes);
        setSelectedShape(null);
        
        socket?.emit("shape-update", {
          whiteboardId: id,
          instanceId,
          shape: null,
          shapes: updatedShapes
        });
      }
      
      setSelectionBox(null);
      setIsAreaSelecting(false);
    }
    
    // Only hide context menu if we're not actively selecting an option
    if (!showMobileContextMenu) {
      setContextMenuPosition(null);
    }
    
    // Reset all touch-related states
    setTouchStartTime(null);
    setTouchStartDistance(null);
    setTouchStartZoom(null);
    setTouchStartMidpoint(null);
    setIsPinching(false);
    setIsDragging(false);
    setStartPanPoint(null);
    setDragStartPoint(null);
  }, [
    isAreaSelecting, selectionBox, shapes, getShapeBounds,
    id, instanceId, socket, showMobileContextMenu
  ]);

  const handleMobilePaste = useCallback(() => {
    if (contextMenuPosition && clipboardShapes.length > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Calculate bounding box for all clipboard shapes
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      clipboardShapes.forEach(shape => {
        const bounds = getShapeBounds(shape);
        minX = Math.min(minX, bounds.x1);
        minY = Math.min(minY, bounds.y1);
        maxX = Math.max(maxX, bounds.x2);
        maxY = Math.max(maxY, bounds.y2);
      });

      const groupCenterX = (minX + maxX) / 2;
      const groupCenterY = (minY + maxY) / 2;

      // Get the target paste position in canvas coordinates
      const { x: targetX, y: targetY } = screenToCanvasCoordinates(
        contextMenuPosition.x,
        contextMenuPosition.y
      );

      // Calculate the offset from group center to paste position
      const offsetX = targetX - groupCenterX;
      const offsetY = targetY - groupCenterY;

      // Create copies of clipboard shapes maintaining their relative positions
      const pastedShapes: Shape[] = clipboardShapes.map(shape => ({
        ...shape,
        id: nanoid(),
        points: shape.points.map(point => ({
          x: point.x + offsetX,
          y: point.y + offsetY
        })),
        selected: false,
        multiSelected: false,
        ...(shape.controlPoint ? {
          controlPoint: {
            x: shape.controlPoint.x + offsetX,
            y: shape.controlPoint.y + offsetY
          }
        } : {})
      }));

      const updatedShapes = [...shapes, ...pastedShapes];
      setShapes(updatedShapes);
      
      // Emit socket event for shape update
      socket?.emit("shape-update", {
        whiteboardId: id,
        instanceId,
        shapes: updatedShapes
      });
      
      // Save canvas state
      saveCanvasState(updatedShapes);
      
      // Add to history
      addToHistory(updatedShapes);
    }
    
    // Hide the context menu
    setShowMobileContextMenu(false);
    setContextMenuPosition(null);
  }, [contextMenuPosition, clipboardShapes, shapes, id, instanceId, socket, saveCanvasState, addToHistory, screenToCanvasCoordinates, getShapeBounds]);

  const handleCopySelectedShapes = useCallback(() => {
    const shapesToCopy = shapes.filter(shape => shape.selected || shape.multiSelected);
    if (shapesToCopy.length > 0) {
      setClipboardShapes(shapesToCopy);
      toast({
        title: "Copied",
        description: `${shapesToCopy.length} ${shapesToCopy.length === 1 ? 'shape' : 'shapes'} copied to clipboard`,
        duration: 2000,
      });
    }
    setShowMobileContextMenu(false);
    setContextMenuPosition(null);
  }, [shapes, toast]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-900 touch-none">
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
        strokeStyle={strokeStyle}
        setStrokeStyle={setStrokeStyle}
        onExport={handleExport}
        showExportInToolbar={showExportInToolbar}
      />
      
      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={(open) => {
        if (!isExporting) {
          setShowExportDialog(open);
        }
      }}>
        <DialogContent className="w-[calc(100%-32px)] max-w-[425px] p-4 md:p-6">
          <DialogHeader>
            <DialogTitle>Export Whiteboard</DialogTitle>
            <DialogDescription>
              Choose a format to export your whiteboard.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-3 md:gap-4 md:py-4">
            <div className="grid gap-2">
              <Label htmlFor="filename">File Name</Label>
              <input
                id="filename"
                className="flex h-9 md:h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={exportFileName}
                onChange={(e) => setExportFileName(e.target.value)}
                placeholder="whiteboard-export"
                disabled={isExporting}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Export Format</Label>
              <RadioGroup 
                value={exportFormat} 
                onValueChange={(value) => setExportFormat(value as "png" | "pdf")}
                className="flex flex-col space-y-1.5"
                disabled={isExporting}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="png" id="png" disabled={isExporting} />
                  <Label htmlFor="png" className="text-sm">PNG Image</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" disabled={isExporting} />
                  <Label htmlFor="pdf" className="text-sm">PDF Document</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include-background"
                checked={includeBackground}
                onChange={(e) => setIncludeBackground(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                disabled={isExporting}
              />
              <Label htmlFor="include-background" className="text-sm">Include grid background</Label>
            </div>
          </div>
          
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowExportDialog(false)} 
              disabled={isExporting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={performExport} 
              disabled={isExporting}
              className="w-full sm:w-auto"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                "Export"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
            
      {/* Property editor for selected shape */}
      {selectedShape && (
        <Collapsible
          className="absolute right-4 top-4 rounded-lg border border-zinc-700 bg-zinc-800/90 shadow-lg backdrop-blur z-10 md:open:h-auto"
          defaultOpen={isDesktop}
        >
          <div className="p-4 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-white">Edit {selectedShape.tool.charAt(0).toUpperCase() + selectedShape.tool.slice(1)}</span>
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="text-zinc-400 hover:text-white"
                      onClick={() => {
                        setSelectedShape(null);
                        const updatedShapes = shapes.map(s => ({ ...s, selected: false }));
                        setShapes(updatedShapes);
                        socket?.emit("shape-update-end", {
                          whiteboardId: id,
                          instanceId,
                          shapes: updatedShapes
                        });
                      }}
                    >
                      ✕
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Close editor</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <CollapsibleTrigger className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:opacity-100 md:hidden">
                <ChevronDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent className="p-4 pt-0">
            {/* Color picker - only show for non-eraser tools */}
            {selectedShape.tool !== "eraser" && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Color</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { color: "#000000", label: "Black" },
                    { color: "#ff0000", label: "Red" },
                    { color: "#00ff00", label: "Green" },
                    { color: "#0000ff", label: "Blue" },
                    { color: "#ffff00", label: "Yellow" },
                    { color: "#ff00ff", label: "Magenta" },
                    { color: "#00ffff", label: "Cyan" }
                  ].map((c) => (
                    <TooltipProvider key={c.color}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full p-0"
                            style={{ backgroundColor: c.color }}
                            onClick={() => {
                              const updatedShapes = shapes.map(shape => {
                                if (shape.id === selectedShape.id) {
                                  return {
                                    ...shape,
                                    color: c.color
                                  };
                                }
                                return shape;
                              });
                              setShapes(updatedShapes);
                              const updatedSelectedShape = updatedShapes.find(s => s.id === selectedShape.id);
                              if (updatedSelectedShape) {
                                setSelectedShape(updatedSelectedShape);
                                socket?.emit("shape-update", {
                                  whiteboardId: id,
                                  instanceId,
                                  shape: updatedSelectedShape,
                                  shapes: updatedShapes
                                });
                                saveCanvasState(updatedShapes);
                              }
                            }}
                          >
                            {selectedShape.color === c.color && <div className="h-5 w-5 rounded-full border-2 border-zinc-800" />}
                            <span className="sr-only">Select color {c.label}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{c.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            )}

            {/* Fill style controls - only show for shapes that can be filled */}
            {selectedShape.tool !== "eraser" && selectedShape.tool !== "text" && selectedShape.tool !== "pen" && (
              <div className=" flex flex-col mb-3 hidden stage-3">
                <label className="text-xs text-zinc-400 block mb-2">Fill Style</label>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 py-2 px-3 text-sm rounded flex items-center justify-center gap-2 ${
                      (selectedShape.fillStyle || "transparent") === "transparent"
                        ? "bg-blue-500 text-white" 
                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    }`}
                    onClick={() => {
                      const updatedShapes = shapes.map(shape => {
                        if (shape.id === selectedShape.id) {
                          return {
                            ...shape,
                            fillStyle: "transparent",
                            fillOpacity: undefined
                          };
                        }
                        return shape;
                      });
                      setShapes(updatedShapes);
                      const updatedSelectedShape = updatedShapes.find(s => s.id === selectedShape.id);
                      if (updatedSelectedShape) {
                        setSelectedShape(updatedSelectedShape);
                        socket?.emit("shape-update", {
                          whiteboardId: id,
                          instanceId,
                          shape: updatedSelectedShape,
                          shapes: updatedShapes
                        });
                        saveCanvasState(updatedShapes);
                      }
                    }}
                  >
                    <span>○</span>
                    <span>Transparent</span>
                  </button>
                  <button
                    className={`flex-1 py-2 px-3 text-sm rounded flex items-center justify-center gap-2 ${
                      selectedShape.fillStyle === "solid"
                        ? "bg-blue-500 text-white" 
                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    }`}
                    onClick={() => {
                      const updatedShapes = shapes.map(shape => {
                        if (shape.id === selectedShape.id) {
                          return {
                            ...shape,
                            fillStyle: "solid",
                            fillOpacity: 0.5
                          };
                        }
                        return shape;
                      });
                      setShapes(updatedShapes);
                      const updatedSelectedShape = updatedShapes.find(s => s.id === selectedShape.id);
                      if (updatedSelectedShape) {
                        setSelectedShape(updatedSelectedShape);
                        socket?.emit("shape-update", {
                          whiteboardId: id,
                          instanceId,
                          shape: updatedSelectedShape,
                          shapes: updatedShapes
                        });
                        saveCanvasState(updatedShapes);
                      }
                    }}
                  >
                    <span>●</span>
                    <span>Solid</span>
                  </button>
                </div>
              </div>
            )}

            {/* Fill opacity slider - only show for solid fill */}
            {selectedShape.tool !== "eraser" && selectedShape.tool !== "text" && selectedShape.fillStyle === "solid" && (
              <div className="flex flex-col mb-3 hidden stage-3">
                <label className="text-xs text-zinc-400 block mb-2">Fill Opacity</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={(selectedShape.fillOpacity || 0.5) * 100}
                    onChange={(e) => {
                      const newOpacity = parseInt(e.target.value) / 100;
                      const updatedShapes = shapes.map(shape => {
                        if (shape.id === selectedShape.id) {
                          return {
                            ...shape,
                            fillOpacity: newOpacity
                          };
                        }
                        return shape;
                      });
                      setShapes(updatedShapes);
                      const updatedSelectedShape = updatedShapes.find(s => s.id === selectedShape.id);
                      if (updatedSelectedShape) {
                        setSelectedShape(updatedSelectedShape);
                        socket?.emit("shape-update", {
                          whiteboardId: id,
                          instanceId,
                          shape: updatedSelectedShape,
                          shapes: updatedShapes
                        });
                        saveCanvasState(updatedShapes);
                      }
                    }}
                    className="flex-1 accent-blue-500"
                  />
                  <div className="text-xs font-mono bg-zinc-700 px-2 py-1 rounded min-w-[48px] text-center">
                    {Math.round((selectedShape.fillOpacity || 0.5) * 100)}%
                  </div>
                </div>
              </div>
            )}
            
            {/* Stroke Style - only show for shapes that can have different stroke styles */}
            {selectedShape.tool !== "eraser" && selectedShape.tool !== "text" && (
              <div className="mb-3">
                <label className="text-xs text-zinc-400 mb-1 block">Stroke Style</label>
                <div className="flex gap-1">
                  <TooltipProvider>
                  {strokeStyles.map((style) => (
                    <Tooltip key={style.id}>
                      <TooltipTrigger asChild>
                        <button
                          className={`flex-1 py-2 px-2 text-xs rounded ${
                            (selectedShape.strokeStyle || "solid") === style.id 
                              ? "bg-blue-500 text-white" 
                              : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                          }`}
                          onClick={() => {
                            // Update the selected shape's stroke style
                            const updatedShapes = shapes.map(shape => {
                              if (shape.id === selectedShape.id) {
                                return {
                                  ...shape,
                                  strokeStyle: style.id
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
                          <div className="flex items-center justify-center">
                            <style.Icon className="text-2xl" />
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{style.id.charAt(0).toUpperCase() + style.id.slice(1)}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  </TooltipProvider>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="mt-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-3 rounded text-xs font-medium transition-colors mr-2"
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
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit the text content</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Resize button for text shapes */}
            {selectedShape.tool === "text" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Change the text box dimensions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Delete button */}
            <div className="flex gap-2 mt-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy this shape to clipboard</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete this shape</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CollapsibleContent>
        </Collapsible>
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
      
      {/* Mobile Context Menu */}
      {showMobileContextMenu && contextMenuPosition && (
        <div
          className="fixed z-50 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 py-2"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {clipboardShapes.length > 0 && (
            <button
              className="w-full px-4 py-2 text-sm text-white hover:bg-zinc-700 text-left"
              onClick={handleMobilePaste}
            >
              Paste {clipboardShapes.length} {clipboardShapes.length === 1 ? 'shape' : 'shapes'}
            </button>
          )}
          {shapes.some(shape => shape.selected || shape.multiSelected) && (
            <button
              className="w-full px-4 py-2 text-sm text-white hover:bg-zinc-700 text-left"
              onClick={handleCopySelectedShapes}
            >
              Copy {shapes.filter(shape => shape.selected || shape.multiSelected).length} {shapes.filter(shape => shape.selected || shape.multiSelected).length === 1 ? 'shape' : 'shapes'}
            </button>
          )}
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {Object.entries(cursors).map(([clientId, cursor]) => (
        <UserCursor 
          key={clientId} 
          x={cursor.x} 
          y={cursor.y} 
          name={cursor.user.name} 
          className="hidden stage-2" // Hidden in Stage 1, will be shown in Stage 2
        />
      ))}

      <div className="fixed bottom-4 right-4 flex items-center gap-4 rounded-lg border bg-zinc-800/90 p-2 shadow-lg backdrop-blur">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="hover:bg-zinc-700/90 rounded-md p-1" 
                onClick={handleZoomIn}
                disabled={zoomLevel >= MAX_ZOOM}
              > 
                <FaPlus className="text-white text-sm"/> 
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom In <span className="text-xs text-muted-foreground ml-1">(Ctrl+Plus)</span></p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {editingZoom ? (
          <input
            type="text"
            value={zoomInput}
            onChange={handleZoomInputChange}
            onBlur={handleZoomInputBlur}
            onKeyDown={handleZoomInputKeyDown}
            className="w-12 bg-transparent text-white text-center focus:outline-none"
            autoFocus
          />
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span 
                  className="w-12 text-white text-center cursor-pointer" 
                  onClick={() => {
                    setZoomInput(Math.round(zoomLevel * 100).toString());
                    setEditingZoom(true);
                  }}
                >
                  {Math.round(zoomLevel * 100)}%
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to edit zoom level</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="hover:bg-zinc-700/90 rounded-md p-1" 
                onClick={handleZoomOut}
                disabled={zoomLevel <= MIN_ZOOM}
              > 
                <FaMinus className="text-white text-sm"/> 
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom Out <span className="text-xs text-muted-foreground ml-1">(Ctrl+Minus)</span></p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

