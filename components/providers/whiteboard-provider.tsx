"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type WhiteboardContextType = {
  whiteboardsUpdated: boolean
  setWhiteboardsUpdated: (updated: boolean) => void
  markWhiteboardsUpdated: () => void
}

const WhiteboardContext = createContext<WhiteboardContextType | undefined>(undefined)

export function WhiteboardProvider({ children }: { children: ReactNode }) {
  const [whiteboardsUpdated, setWhiteboardsUpdated] = useState(false)

  // Check localStorage on mount to see if whiteboards were updated
  useEffect(() => {
    const checkForUpdates = () => {
      const updated = localStorage.getItem("whiteboards_updated") === "true"
      if (updated) {
        setWhiteboardsUpdated(true)
        // Clear the flag after reading it
        localStorage.removeItem("whiteboards_updated")
      }
    }

    // Check immediately on mount
    checkForUpdates()

    // Also check when the window gets focus (user returns to the tab)
    window.addEventListener("focus", checkForUpdates)
    
    return () => {
      window.removeEventListener("focus", checkForUpdates)
    }
  }, [])

  const markWhiteboardsUpdated = () => {
    localStorage.setItem("whiteboards_updated", "true")
    setWhiteboardsUpdated(true)
  }

  return (
    <WhiteboardContext.Provider 
      value={{ 
        whiteboardsUpdated, 
        setWhiteboardsUpdated,
        markWhiteboardsUpdated
      }}
    >
      {children}
    </WhiteboardContext.Provider>
  )
}

export function useWhiteboardUpdates() {
  const context = useContext(WhiteboardContext)
  if (context === undefined) {
    throw new Error("useWhiteboardUpdates must be used within a WhiteboardProvider")
  }
  return context
} 