"use client"

import { Pencil, Square, Circle, ArrowRight, Eraser, Hand, MousePointer, Trash2, Undo, Redo, Type, SquareMousePointer, CornerDownRight, Diamond, Download } from "lucide-react"
import { TbLineDashed , TbLineDotted  } from "react-icons/tb"
import { FaMinus  } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useState, useEffect } from "react"

interface WhiteboardToolbarProps {
  tool: string
  setTool: (tool: string) => void
  color: string
  setColor: (color: string) => void
  width: number
  setWidth: (width: number) => void
  isReadOnly: boolean
  onClear: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  strokeStyle: string
  setStrokeStyle: (style: string) => void
  onExport?: () => void
  showExportInToolbar?: boolean
}

// Stage 1 tools - Basic drawing functionality
const stage1Tools = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "pen", icon: Pencil, label: "Pen" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
]

// Stage 2 tools - Intermediate features
const stage2Tools = [
  { id: "hand", icon: Hand, label: "Hand (Pan)" },
  { id: "area-select", icon: SquareMousePointer, label: "Area Select" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
]

// Stage 3 tools - Advanced features
const stage3Tools = [
  { id: "text", icon: Type, label: "Text" },
  { id: "curved-arrow", icon: CornerDownRight, label: "Curved Arrow" },
  { id: "diamond", icon: Diamond, label: "Diamond" },
]

// Combine all tools for the complete toolbar
const tools = [
  ...stage1Tools,
  ...stage2Tools,
  ...stage3Tools,
]

const colors = [
  "#FFFFFF", // White
  "#FF4444", // Red
  "#44FF44", // Green
  "#4444FF", // Blue
  "#FFFF44", // Yellow
  "#FF44FF", // Magenta
  "#44FFFF", // Cyan
]

const strokeStyles = [
  { id: "solid", label: "Solid", Icon: FaMinus  },
  { id: "dashed", label: "Dashed", Icon: TbLineDashed },
  { id: "dotted", label: "Dotted", Icon: TbLineDotted },
]

export function WhiteboardToolbar({
  tool,
  setTool,
  color,
  setColor,
  width,
  setWidth,
  isReadOnly,
  onClear,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  strokeStyle,
  setStrokeStyle,
  onExport,
  showExportInToolbar = true,
}: WhiteboardToolbarProps) {
  const [showPenSettings, setShowPenSettings] = useState(false);

  // Show pen settings when drawing tools are selected
  useEffect(() => {
    if (tool === "pen" || tool === "arrow" || tool === "curved-arrow" || tool === "rectangle" || tool === "circle" || tool === "diamond" || tool === "text") {
      setShowPenSettings(true);
    } else {
      setShowPenSettings(false);
    }
  }, [tool]);

  if (isReadOnly) return null

  return (
    <>
      {/* Main Toolbar */}
      <div className="absolute left-4 top-4 flex flex-col gap-4 rounded-lg border bg-zinc-800/90 p-2 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-2">
          <TooltipProvider>
            {/* Stage 1 Tools */}
            {stage1Tools.map((t) => (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <Button variant={tool === t.id ? "default" : "ghost"} size="icon" onClick={() => setTool(t.id)}>
                    <t.icon className="h-4 w-4" />
                    <span className="sr-only">{t.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            
            {/* Stage 2 Tools - Hidden in Stage 1 */}
            {stage2Tools.map((t) => (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <Button 
                    variant={tool === t.id ? "default" : "ghost"} 
                    size="icon" 
                    onClick={() => setTool(t.id)}
                    className="hidden stage-2" // Hidden in Stage 1, will be shown in Stage 2
                  >
                    <t.icon className="h-4 w-4" />
                    <span className="sr-only">{t.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            
            {/* Stage 3 Tools - Hidden in Stages 1 and 2 */}
            {stage3Tools.map((t) => (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <Button 
                    variant={tool === t.id ? "default" : "ghost"} 
                    size="icon" 
                    onClick={() => setTool(t.id)}
                    className="hidden stage-3" // Hidden in Stages 1 and 2, will be shown in Stage 3
                  >
                    <t.icon className="h-4 w-4" />
                    <span className="sr-only">{t.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
        
        {/* Undo/Redo buttons - Stage 1 */}
        <div className="h-px bg-border" />
        <div className="flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onUndo}
                  disabled={!canUndo}
                  className={!canUndo ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <Undo className="h-4 w-4" />
                  <span className="sr-only">Undo</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Undo</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onRedo}
                  disabled={!canRedo}
                  className={!canRedo ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <Redo className="h-4 w-4" />
                  <span className="sr-only">Redo</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Redo</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Export Button - Stage 3 feature */}
            {showExportInToolbar && onExport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onExport}
                    className="hidden stage-3" // Hidden in Stages 1 and 2, will be shown in Stage 3
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Export</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Export</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
        
        <div className="h-px bg-border" />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Clear canvas</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Canvas</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all drawings from the canvas. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onClear}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Pen Settings Box - Stage 1 for basic settings, Stage 3 for advanced settings */}
      {showPenSettings && (
        <div className="absolute right-4 top-4 rounded-lg border bg-zinc-800/90 p-4 shadow-lg backdrop-blur">
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Color</h3>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <Button
                  key={c}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full p-0"
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                >
                  {color === c && <div className="h-5 w-5 rounded-full border-2 border-zinc-800" />}
                  <span className="sr-only">Select color {c}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Stroke Style Selector - Stage 3 feature */}
          {tool !== "text" && tool !== "eraser" && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Stroke Style</h3>
              <div className="flex gap-2">
                {strokeStyles.map((style) => (
                  <button
                    key={style.id}
                    className={`flex-1 py-2 px-2 rounded ${
                      (strokeStyle || "solid") === style.id 
                        ? "bg-blue-500 text-white" 
                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    }`}
                    onClick={() => setStrokeStyle(style.id)}
                  >
                    <div className="flex items-center justify-center">
                      <style.Icon className="text-2xl" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium mb-2">Width</h3>
            <Slider
              value={[width]}
              min={1}
              max={20}
              step={1}
              onValueChange={(value) => setWidth(value[0])}
              className="w-full"
            />
          </div>
        </div>
      )}
    </>
  )
}

