"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { useWhiteboardUpdates } from "@/components/providers/whiteboard-provider"

interface Collaborator {
  id: string
  userId: string
  whiteboardId: string
  canEdit: boolean
  user: {
    id: string
    name: string
    email: string
  }
}

interface CollaboratorListProps {
  whiteboardId: string
  collaborators: Collaborator[]
  setCollaborators: (collaborators: Collaborator[]) => void
}

export function CollaboratorList({ whiteboardId, collaborators, setCollaborators }: CollaboratorListProps) {
  const { toast } = useToast()
  const { markWhiteboardsUpdated } = useWhiteboardUpdates()
  const [isLoading, setIsLoading] = useState(false)

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      const response = await fetch(`/api/whiteboards/${whiteboardId}/collaborators?collaboratorId=${collaboratorId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to remove collaborator")
      }

      setCollaborators(collaborators.filter((c) => c.id !== collaboratorId))
      
      // Mark whiteboards as updated after removing collaborator
      markWhiteboardsUpdated()

      toast({
        title: "Collaborator removed",
        description: "The collaborator has been removed from this whiteboard",
      })
    } catch (error) {
      console.error("Error removing collaborator:", error)
      toast({
        title: "Error",
        description: "Failed to remove collaborator",
        variant: "destructive",
      })
    }
  }

  const handleTogglePermission = async (collaboratorId: string, currentCanEdit: boolean) => {
    try {
      const response = await fetch(
        `/api/whiteboards/${whiteboardId}/collaborators?collaboratorId=${collaboratorId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            canEdit: !currentCanEdit,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update collaborator permissions")
      }

      const updatedCollaborator = await response.json()
      setCollaborators(collaborators.map((c) => (c.id === collaboratorId ? updatedCollaborator : c)))
      
      // Mark whiteboards as updated after changing permissions
      markWhiteboardsUpdated()

      toast({
        title: "Permissions updated",
        description: `Collaborator is now ${!currentCanEdit ? "an editor" : "a viewer"}`,
      })
    } catch (error) {
      console.error("Error updating collaborator permissions:", error)
      toast({
        title: "Error",
        description: "Failed to update collaborator permissions",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="text-center py-2 text-sm text-muted-foreground">Loading collaborators...</div>
  }

  if (collaborators.length === 0) {
    return <div className="text-center py-2 text-sm text-muted-foreground">No collaborators yet</div>
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Current Collaborators</h3>
      <ul className="space-y-2">
        {collaborators.map((collaborator) => (
          <li 
            key={collaborator.id} 
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border bg-background/50 p-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{collaborator.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{collaborator.user.email}</p>
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => handleTogglePermission(collaborator.id, collaborator.canEdit)}
              >
                {collaborator.canEdit ? "Make Viewer" : "Make Editor"}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleRemoveCollaborator(collaborator.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

