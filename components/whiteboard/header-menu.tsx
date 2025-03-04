"use client"

import { Menu } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface HeaderMenuProps {
  onExport: () => void
  clipboardCount: number
  onClearClipboard: () => void
}

export function HeaderMenu({ onExport, clipboardCount, onClearClipboard }: HeaderMenuProps) {
  return (
    <div className="flex items-center gap-2">
      {clipboardCount > 0 && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}