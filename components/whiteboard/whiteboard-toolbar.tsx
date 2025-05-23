"use client"

import { Pencil, Square, Circle, ArrowRight, Eraser, Hand, MousePointer, Trash2, Undo, Redo, Type, SquareMousePointer, CornerDownRight, Diamond, Download, ChevronUp, ChevronDown, Settings } from "lucide-react"
import { TbLineDashed , TbLineDotted  } from "react-icons/tb"
import { FaMinus  } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  { id: "select", icon: MousePointer, label: "Select", shortcut: "V" },
  { id: "pen", icon: Pencil, label: "Pen", shortcut: "P" },
  { id: "rectangle", icon: Square, label: "Rectangle", shortcut: "1" },
  { id: "circle", icon: Circle, label: "Circle", shortcut: "2" },
  { id: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
]

// Stage 2 tools - Intermediate features
const stage2Tools = [
  { id: "hand", icon: Hand, label: "Hand (Pan)", shortcut: "H" },
  { id: "area-select", icon: SquareMousePointer, label: "Area Select", shortcut: "A" },
  { id: "arrow", icon: ArrowRight, label: "Arrow", shortcut: "3" },
]

// Stage 3 tools - Advanced features
const stage3Tools = [
  { id: "curved-arrow", icon: CornerDownRight, label: "Curved Arrow", shortcut: "4" },
  { id: "diamond", icon: Diamond, label: "Diamond", shortcut: "5" },
  { id: "text", icon: Type, label: "Text", shortcut: "T" },
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

const colorNames: Record<string, string> = {
  "#FFFFFF": "White",
  "#FF4444": "Red",
  "#44FF44": "Green",
  "#4444FF": "Blue",
  "#FFFF44": "Yellow",
  "#FF44FF": "Magenta",
  "#44FFFF": "Cyan"
}

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
      <Collapsible
        className="absolute left-4 top-4 rounded-lg border bg-zinc-800/90 shadow-lg backdrop-blur md:open:h-auto"
        defaultOpen={true}
      >
        <div className="p-2 flex items-center justify-between gap-2 md:hidden">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
          </div>
          <CollapsibleTrigger className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:opacity-100">
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">Toggle tools</span>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="flex flex-col p-2 pt-0 md:p-2">
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
                    <p>{t.label} <span className="text-xs text-muted-foreground ml-1">({t.shortcut})</span></p>
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
                    {t.id === "area-select" ? (
                      <div>
                        <p>{t.label} <span className="text-xs text-muted-foreground ml-1">({t.shortcut})</span></p>
                        <p className="text-xs text-muted-foreground">Ctrl+A to select all</p>
                      </div>
                    ) : (
                      <p>{t.label} <span className="text-xs text-muted-foreground ml-1">({t.shortcut})</span></p>
                    )}
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
                    <p>{t.label} <span className="text-xs text-muted-foreground ml-1">({t.shortcut})</span></p>
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
                  <p>Undo <span className="text-xs text-muted-foreground ml-1">(Ctrl+Z)</span></p>
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
                  <p>Redo <span className="text-xs text-muted-foreground ml-1">(Ctrl+R)</span></p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="h-px bg-border" />
          <TooltipProvider>
            <Tooltip>
              <AlertDialog>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Clear canvas</span>
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Clear Canvas <span className="text-xs text-muted-foreground ml-1">(X)</span></p>
                </TooltipContent>
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
            </Tooltip>
          </TooltipProvider>
        </CollapsibleContent>
      </Collapsible>

      {/* Pen Settings Box - Stage 1 for basic settings, Stage 3 for advanced settings */}
      {showPenSettings && (
        <Collapsible
          className="absolute right-4 top-4 rounded-lg border bg-zinc-800/90 shadow-lg backdrop-blur md:open:h-auto"
          defaultOpen={true}
        >
          <div className="p-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Drawing Settings</h3>
            <CollapsibleTrigger className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:opacity-100 md:hidden">
              <ChevronDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="p-4 pt-0">
            <TooltipProvider>
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Color</h3>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <Tooltip key={c}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full p-0"
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(c)}
                        >
                          {color === c && <div className="h-5 w-5 rounded-full border-2 border-zinc-800" />}
                          <span className="sr-only">Select color {c}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{colorNames[c]}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {tool !== "text" && tool !== "eraser" && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">Stroke Style</h3>
                  <div className="flex gap-2">
                    {strokeStyles.map((style) => (
                      <Tooltip key={style.id}>
                        <TooltipTrigger asChild>
                          <button
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
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{style.id.charAt(0).toUpperCase() + style.id.slice(1)}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium mb-2">Width</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Slider
                      value={[width]}
                      min={1}
                      max={20}
                      step={1}
                      onValueChange={(value) => setWidth(value[0])}
                      className="w-full"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Pen width: {width}px</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  )
}

