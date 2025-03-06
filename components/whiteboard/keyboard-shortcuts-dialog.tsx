"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Keyboard } from "lucide-react"

interface KeyboardShortcutsDialogProps {
  trigger?: React.ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

interface ShortcutCategory {
  name: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

export function KeyboardShortcutsDialog({ 
  trigger,
  isOpen,
  onOpenChange
}: KeyboardShortcutsDialogProps) {
  const shortcutCategories: ShortcutCategory[] = [
    {
      name: "Tools",
      shortcuts: [
        { keys: ["V"], description: "Select tool" },
        { keys: ["P"], description: "Pen tool" },
        { keys: ["E"], description: "Eraser tool" },
        { keys: ["H"], description: "Hand tool (Pan)" },
        { keys: ["A"], description: "Area select tool" },
        { keys: ["1"], description: "Rectangle tool" },
        { keys: ["2"], description: "Circle tool" },
        { keys: ["3"], description: "Arrow tool" },
        { keys: ["4"], description: "Curved arrow tool" },
        { keys: ["5"], description: "Diamond tool" },
      ]
    },
    {
      name: "Actions",
      shortcuts: [
        { keys: ["Ctrl/Cmd", "Z"], description: "Undo" },
        { keys: ["Ctrl/Cmd", "R"], description: "Redo" },
        { keys: ["Ctrl/Cmd", "C"], description: "Copy selected shape(s)" },
        { keys: ["Ctrl/Cmd", "V"], description: "Paste copied shape(s)" },
        { keys: ["Ctrl/Cmd", "A"], description: "Select all shapes" },
        { keys: ["X"], description: "Clear canvas" },
        { keys: ["Delete"], description: "Delete selected shape(s)" },
      ]
    },
    {
      name: "Navigation",
      shortcuts: [
        { keys: ["Ctrl/Cmd", "+"], description: "Zoom in" },
        { keys: ["Ctrl/Cmd", "-"], description: "Zoom out" },
        { keys: ["Ctrl/Cmd", "0"], description: "Reset zoom" },
      ]
    }
  ]

  // If isOpen and onOpenChange are provided, use them for controlled state
  if (isOpen !== undefined && onOpenChange) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Use these keyboard shortcuts to work more efficiently.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            {shortcutCategories.map((category) => (
              <div key={category.name} className="space-y-3">
                <h3 className="text-lg font-medium">{category.name}</h3>
                <div className="rounded-md border">
                  <div className="divide-y">
                    {category.shortcuts.map((shortcut, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <span 
                              key={keyIndex} 
                              className="inline-flex items-center justify-center rounded-md border bg-muted px-2 py-1 text-xs font-medium"
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise, use the uncontrolled version with trigger
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" data-keyboard-shortcuts-trigger>
            <Keyboard className="h-5 w-5" />
            <span className="sr-only">Keyboard Shortcuts</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to work more efficiently.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          {shortcutCategories.map((category) => (
            <div key={category.name} className="space-y-3">
              <h3 className="text-lg font-medium">{category.name}</h3>
              <div className="rounded-md border">
                <div className="divide-y">
                  {category.shortcuts.map((shortcut, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span 
                            key={keyIndex} 
                            className="inline-flex items-center justify-center rounded-md border bg-muted px-2 py-1 text-xs font-medium"
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
} 