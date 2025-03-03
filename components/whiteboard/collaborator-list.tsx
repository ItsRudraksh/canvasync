"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

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
}

export function CollaboratorList({ whiteboardId }: CollaboratorListProps) {
  const { toast } = useToast()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCollaborators = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/whiteboards/${whiteboardId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch whiteboard")
        }
        const data = await response.json()
        setCollaborators(data.collaborators || [])
      } catch (error) {
        console.error("Error fetching collaborators:", error)
        toast({
          title: "Error",
          description: "Failed to load collaborators",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCollaborators()
  }, [whiteboardId, toast])

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      const response = await fetch(`/api/whiteboards/${whiteboardId}/collaborators?collaboratorId=${collaboratorId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to remove collaborator")
      }

      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId))

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
      setCollaborators((prev) =>
        prev.map((c) => (c.id === collaboratorId ? updatedCollaborator : c))
      )

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
    return <div className="text-center py-4">Loading collaborators...</div>
  }

  if (collaborators.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">No collaborators yet</div>
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Collaborators</h3>
      <ul className="space-y-2">
        {collaborators.map((collaborator) => (
          <li key={collaborator.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">{collaborator.user.name}</p>
              <p className="text-sm text-muted-foreground">{collaborator.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTogglePermission(collaborator.id, collaborator.canEdit)}
              >
                {collaborator.canEdit ? "Make Viewer" : "Make Editor"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleRemoveCollaborator(collaborator.id)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

