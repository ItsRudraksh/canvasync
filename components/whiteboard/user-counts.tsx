"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useSocket } from "@/hooks/use-socket-deploy"

interface UserCountsProps {
  whiteboardId: string
  currentUser?: {
    id: string
    name: string
  }
  isOwner?: boolean
}

export function UserCounts({ whiteboardId, currentUser, isOwner }: UserCountsProps) {
  const { toast } = useToast()
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    const handleUserJoined = (data: { user: { id: string; name: string }; canEdit: boolean; isOwner?: boolean }) => {
      // Only show notifications for collaborators (users with edit access who aren't owners)
      if (data.canEdit === true && !data.isOwner && data.user.id !== currentUser?.id) {
        toast({
          title: "New collaborator joined",
          description: `${data.user.name} just joined the whiteboard`,
          duration: 3000,
        })
      }
    }

    const handleUserLeft = (data: { user: { id: string; name: string }; canEdit?: boolean; isOwner?: boolean }) => {
      // Only show notifications for collaborators who left
      if (data.canEdit === true && !data.isOwner && data.user.id !== currentUser?.id) {
        toast({
          title: "Collaborator left",
          description: `${data.user.name} left the whiteboard`,
          duration: 3000,
        })
      }
    }

    // Listen for user events
    socket.on("user-joined", handleUserJoined)
    socket.on("user-left", handleUserLeft)

    return () => {
      socket.off("user-joined", handleUserJoined)
      socket.off("user-left", handleUserLeft)
    }
  }, [socket, whiteboardId, currentUser, toast])

  // No need to render anything since we're only handling notifications
  return null
} 