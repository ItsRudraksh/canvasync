"use client"

import { Pencil, Square, Circle, ArrowRight, Eraser, Hand, MousePointer, Trash2 } from "lucide-react"
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
      <div className="h-px bg-border" />
      <div className="px-2 py-1">
        <Slider
          min={1}
          max={20}
          step={1}
          value={[width]}
          onValueChange={(value) => setWidth(value[0])}
          className="w-4"
          orientation="vertical"
        />
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
  )
}

