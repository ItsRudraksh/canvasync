"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Whiteboard } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { useWhiteboardUpdates } from "@/components/providers/whiteboard-provider"

interface WhiteboardFormProps {
  whiteboard: Whiteboard
}

export function WhiteboardForm({ whiteboard }: WhiteboardFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { markWhiteboardsUpdated } = useWhiteboardUpdates()
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState(whiteboard.title)
  const [isPublic, setIsPublic] = useState(whiteboard.isPublic)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/whiteboards/${whiteboard.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          isPublic,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update whiteboard")
      }

      markWhiteboardsUpdated()

      toast({
        title: "Whiteboard updated",
        description: "Your whiteboard has been updated successfully",
      })
      router.push("/dashboard")
    } catch (error) {
      console.error("Error updating whiteboard:", error)
      toast({
        title: "Error",
        description: "Failed to update whiteboard",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this whiteboard? This action cannot be undone.")) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/whiteboards/${whiteboard.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete whiteboard")
      }

      markWhiteboardsUpdated()

      toast({
        title: "Whiteboard deleted",
        description: "Your whiteboard has been deleted successfully",
      })
      router.push("/dashboard")
    } catch (error) {
      console.error("Error deleting whiteboard:", error)
      toast({
        title: "Error",
        description: "Failed to delete whiteboard",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Public Access</Label>
          <p className="text-sm text-muted-foreground">
            {isPublic
              ? "Anyone with the link can view this whiteboard"
              : "Only collaborators can access this whiteboard"}
          </p>
        </div>
        <Switch
          id="public"
          checked={isPublic}
          onCheckedChange={setIsPublic}
          disabled={isLoading}
          className="data-[state=checked]:bg-primary"
        />
      </div>
      <div className="flex items-center justify-between">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isLoading}
        >
          Delete Whiteboard
        </Button>
      </div>
    </form>
  )
} 