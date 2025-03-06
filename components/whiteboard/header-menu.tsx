"use client"

import { useState, useEffect } from "react"
import { Menu, Keyboard, Smartphone } from "lucide-react"
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
import { MobileTips } from "./mobile-tips"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface HeaderMenuProps {
  onExport: () => void
  clipboardCount: number
  onClearClipboard: () => void
}

export function HeaderMenu({ onExport, clipboardCount, onClearClipboard }: HeaderMenuProps) {
  const [isKeyboardDialogOpen, setIsKeyboardDialogOpen] = useState(false)
  const [isMobileTipsOpen, setIsMobileTipsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
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
              onClick={() => isMobile ? setIsMobileTipsOpen(true) : setIsKeyboardDialogOpen(true)}
            >
              {isMobile ? (
                <Smartphone className="h-5 w-5" />
              ) : (
                <Keyboard className="h-5 w-5" />
              )}
              <span className="sr-only">
                {isMobile ? "Mobile Tips" : "Keyboard Shortcuts"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isMobile ? "Mobile Tips" : "Keyboard Shortcuts"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Keyboard Shortcuts Dialog for Desktop */}
      <KeyboardShortcutsDialog 
        isOpen={!isMobile && isKeyboardDialogOpen}
        onOpenChange={setIsKeyboardDialogOpen}
      />

      {/* Mobile Tips Dialog */}
      <Dialog open={isMobile && isMobileTipsOpen} onOpenChange={setIsMobileTipsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mobile Gestures Guide</DialogTitle>
            <DialogDescription>
              Learn how to use touch gestures to interact with the whiteboard
            </DialogDescription>
          </DialogHeader>
          <MobileTips />
        </DialogContent>
      </Dialog>
      
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
            onClick={() => isMobile ? setIsMobileTipsOpen(true) : setIsKeyboardDialogOpen(true)}
            className="md:hidden"
          >
            {isMobile ? "Mobile Tips" : "Keyboard Shortcuts"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}