"use client"

import { useRef } from "react"
import { HeaderMenu } from "./header-menu"

interface HeaderMenuWrapperProps {
  clipboardCount: number
  onClearClipboard: () => void
}

export function HeaderMenuWrapper({ clipboardCount, onClearClipboard }: HeaderMenuWrapperProps) {
  const exportFunctionRef = useRef<(() => void) | null>(null);
  
  const handleExportClick = () => {
    if (exportFunctionRef.current) {
      exportFunctionRef.current();
    }
  };
  
  // This function will be called by the WhiteboardEditor to set the export function
  const setExportFunction = (fn: () => void) => {
    exportFunctionRef.current = fn;
  };
  
  // Add this function to the window object so WhiteboardEditor can access it
  if (typeof window !== "undefined") {
    (window as any).__setExportFunction = setExportFunction;
  }
  
  return <HeaderMenu 
    onExport={handleExportClick} 
    clipboardCount={clipboardCount} 
    onClearClipboard={onClearClipboard}
  />;
} 