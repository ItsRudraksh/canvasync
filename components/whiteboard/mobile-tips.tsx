import { Smartphone, Hand, Copy, Move, ZoomIn, Maximize2 } from "lucide-react"

interface TipProps {
  icon: React.ReactNode
  title: string
  description: string
}

function Tip({ icon, title, description }: TipProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className="shrink-0 p-2 rounded-md bg-background">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-medium mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function MobileTips() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium mb-4">Mobile Gestures Guide</h3>
      
      <Tip
        icon={<Hand className="h-4 w-4" />}
        title="Two-Finger Pan"
        description="Use two fingers to drag and move around the canvas"
      />
      
      <Tip
        icon={<ZoomIn className="h-4 w-4" />}
        title="Pinch to Zoom"
        description="Pinch with two fingers to zoom in and out of the canvas"
      />
      
      <Tip
        icon={<Copy className="h-4 w-4" />}
        title="Copy & Paste"
        description="Long press on selected shape to copy, then long press anywhere to paste"
      />
      
      <Tip
        icon={<Maximize2 className="h-4 w-4" />}
        title="Area Selection"
        description="Long press and drag on empty space to select multiple shapes"
      />
      
      <Tip
        icon={<Move className="h-4 w-4" />}
        title="Move Elements"
        description="Tap to select a shape, then drag to move it"
      />
    </div>
  )
} 