"use client"

import { Pencil, Square, Circle, ArrowRight, Eraser, Hand, MousePointer, Trash2, ChevronDown } from "lucide-react"
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
import { useState, useEffect, useRef } from "react"

interface WhiteboardToolbarProps {
  tool: string
  setTool: (tool: string) => void
  color: string
  setColor: (color: string) => void
  width: number
  setWidth: (width: number) => void
  isReadOnly: boolean
  onClear: () => void
}

const tools = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "hand", icon: Hand, label: "Hand (Pan)" },
  { id: "pen", icon: Pencil, label: "Pen" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
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

export function WhiteboardToolbar({
  tool,
  setTool,
  color,
  setColor,
  width,
  setWidth,
  isReadOnly,
  onClear,
}: WhiteboardToolbarProps) {
  const [showWidthDropdown, setShowWidthDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWidthDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Show width dropdown when pen tool is selected
  useEffect(() => {
    if (tool === "pen" || tool === "arrow" || tool === "rectangle" || tool === "circle") {
      setShowWidthDropdown(true);
    } else {
      setShowWidthDropdown(false);
    }
  }, [tool]);

  if (isReadOnly) return null

  return (
    <div className="absolute left-4 top-4 flex flex-col gap-4 rounded-lg border bg-zinc-800/90 p-2 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-2">
        <TooltipProvider>
          {tools.map((t) => (
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
        </TooltipProvider>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-2">
        {colors.map((c) => (
          <Button
            key={c}
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full p-0"
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
          >
            {color === c && <div className="h-4 w-4 rounded-full border-2 border-zinc-800" />}
            <span className="sr-only">Select color {c}</span>
          </Button>
        ))}
      </div>
      
      {/* Width dropdown for pen tool */}
      {showWidthDropdown && (
        <div ref={dropdownRef} className="relative">
          <div className="h-px bg-border" />
          <div className="p-2 flex flex-col items-center">
            <div className="text-xs text-zinc-400 mb-1">Width: {width}px</div>
            <div className="flex items-center gap-2 mb-2">
              <Slider
                min={1}
                max={20}
                step={1}
                value={[width]}
                onValueChange={(value) => setWidth(value[0])}
                className="w-20"
              />
              <div 
                className="h-6 w-6 rounded-full flex-shrink-0 border border-zinc-600"
                style={{ backgroundColor: color }}
              >
                <div className="h-full w-full rounded-full flex items-center justify-center">
                  <div 
                    className="rounded-full bg-current"
                    style={{ 
                      width: `${Math.min(width * 1.2, 20)}px`, 
                      height: `${Math.min(width * 1.2, 20)}px`,
                      backgroundColor: color
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
  )
}

