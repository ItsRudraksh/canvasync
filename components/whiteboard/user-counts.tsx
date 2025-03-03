"use client"

import { useEffect, useState } from "react"
import { Users, UserCheck, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSocket } from "@/hooks/use-socket"

interface UserCountsProps {
  whiteboardId: string
  canEdit: boolean
  currentUser?: {
    id: string
    name: string
  }
}

export function UserCounts({ whiteboardId, canEdit, currentUser }: UserCountsProps) {
  const { toast } = useToast()
  const { socket } = useSocket()
  const [counts, setCounts] = useState({ collaborators: 0, viewers: 0 })

  useEffect(() => {
    if (!socket) return

    const handleUserJoined = (data: any) => {
      console.log("User joined:", data)
      setCounts(data.counts)
      if (data.canEdit && data.user.id !== currentUser?.id) {
        // Ensure toast is called with the correct parameters
        toast({
          title: "New collaborator joined",
          description: `${data.user.name} just joined the whiteboard`,
          duration: 3000,
        })
      }
    }

    const handleUserLeft = (data: any) => {
      console.log("User left:", data)
      setCounts(data.counts)
    }

    const handleCountsUpdate = (newCounts: any) => {
      console.log("Received counts update:", newCounts)
      setCounts(newCounts)
    }

    // Listen for user count updates
    socket.on("user-counts-update", handleCountsUpdate)
    socket.on("user-joined", handleUserJoined)
    socket.on("user-left", handleUserLeft)

    return () => {
      socket.off("user-counts-update", handleCountsUpdate)
      socket.off("user-joined", handleUserJoined)
      socket.off("user-left", handleUserLeft)
    }
  }, [socket, currentUser?.id, toast])

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1">
            <UserCheck className="h-4 w-4" />
            <span>{counts.collaborators}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Active collaborators</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{counts.viewers}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Active viewers</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
} 