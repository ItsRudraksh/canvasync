"use client"

import type React from "react"

import { useState } from "react"
import { Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { CollaboratorList } from "./collaborator-list"

interface ShareButtonProps {
  whiteboardId: string
}

export function ShareButton({ whiteboardId }: ShareButtonProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [collaboratorEmail, setCollaboratorEmail] = useState("")
  const [canEdit, setCanEdit] = useState(false)

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/shared/${whiteboardId}` : ""

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink)
    toast({
      title: "Link copied",
      description: "The share link has been copied to your clipboard",
    })
  }

  const handleTogglePublic = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/whiteboards/${whiteboardId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPublic: !isPublic,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update whiteboard")
      }

      setIsPublic(!isPublic)
      toast({
        title: isPublic ? "Whiteboard is now private" : "Whiteboard is now public",
      })
    } catch (error) {
      console.error("Error updating whiteboard:", error)
      toast({
        title: "Error",
        description: "Failed to update whiteboard visibility",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch(`/api/whiteboards/${whiteboardId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: collaboratorEmail,
          canEdit,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to add collaborator")
      }

      toast({
        title: "Collaborator added",
        description: `${collaboratorEmail} has been added as a collaborator`,
      })
      setCollaboratorEmail("")
    } catch (error) {
      console.error("Error adding collaborator:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add collaborator",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Share className="h-4 w-4" />
          <span className="sr-only">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Whiteboard</DialogTitle>
          <DialogDescription>Share your whiteboard with others or make it public</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="link">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Switch id="public" checked={isPublic} onCheckedChange={handleTogglePublic} disabled={isLoading} />
              <Label htmlFor="public">Make whiteboard public</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Input value={shareLink} readOnly className="flex-1" />
              <Button onClick={handleCopyLink} type="button">
                Copy
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {isPublic
                ? "Anyone with the link can view this whiteboard"
                : "Only collaborators can access this whiteboard"}
            </p>
          </TabsContent>
          <TabsContent value="collaborators" className="py-4">
            <form onSubmit={handleAddCollaborator} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={collaboratorEmail}
                  onChange={(e) => setCollaboratorEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="canEdit" checked={canEdit} onCheckedChange={setCanEdit} />
                <Label htmlFor="canEdit">Can edit</Label>
              </div>
              <Button type="submit" disabled={isLoading || !collaboratorEmail}>
                {isLoading ? "Adding..." : "Add Collaborator"}
              </Button>
            </form>
            <div className="mt-6">
              <CollaboratorList whiteboardId={whiteboardId} />
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

