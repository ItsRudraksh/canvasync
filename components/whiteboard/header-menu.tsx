"use client"

import { Menu, Keyboard } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from "react"

interface HeaderMenuProps {
  onExport: () => void
  clipboardCount: number
  onClearClipboard: () => void
}

export function HeaderMenu({ onExport, clipboardCount, onClearClipboard }: HeaderMenuProps) {
  const [isKeyboardDialogOpen, setIsKeyboardDialogOpen] = useState(false);
  
  return (
    <div className="flex items-center gap-1">
      {clipboardCount > 0 && (
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <span>{clipboardCount} {clipboardCount === 1 ? 'shape' : 'shapes'} copied</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClearClipboard}
            className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            Clear
          </Button>
        </div>
      )}
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden md:flex" 
              data-keyboard-shortcuts-trigger
              onClick={() => setIsKeyboardDialogOpen(true)}
            >
              <Keyboard className="h-5 w-5" />
              <span className="sr-only">Keyboard Shortcuts</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Keyboard Shortcuts</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <KeyboardShortcutsDialog 
        isOpen={isKeyboardDialogOpen}
        onOpenChange={setIsKeyboardDialogOpen}
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={onExport}
            className="hidden stage-3"
          >
            Export Whiteboard
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setIsKeyboardDialogOpen(true)}
            className="md:hidden"
          >
            Keyboard Shortcuts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}