"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Share, Globe, Lock } from "lucide-react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MobileTips } from "./mobile-tips"

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
  const [copied, setCopied] = useState(false)
  const [collaborators, setCollaborators] = useState<any[]>([])

  // Disable keyboard shortcuts when dialog is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen) {
        e.stopPropagation()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown, true)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen])

  // Fetch initial whiteboard state and collaborators
  useEffect(() => {
    const fetchWhiteboard = async () => {
      try {
        const response = await fetch(`/api/whiteboards/${whiteboardId}`)
        if (!response.ok) throw new Error("Failed to fetch whiteboard")
        const data = await response.json()
        setIsPublic(data.isPublic)
        setCollaborators(data.collaborators || [])
      } catch (error) {
        console.error("Error fetching whiteboard:", error)
      }
    }
    fetchWhiteboard()
  }, [whiteboardId])

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/shared/${whiteboardId}` : ""

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    toast({
      title: "Link copied",
      description: "The share link has been copied to your clipboard",
    })
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(false)
    }, 2000)
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
        description: isPublic
          ? "Only collaborators can access this whiteboard"
          : "Anyone with the link can view this whiteboard",
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

      const newCollaborator = await response.json()
      setCollaborators(prev => [...prev, newCollaborator])

      toast({
        title: "Collaborator added",
        description: `${collaboratorEmail} has been added as a collaborator`,
      })
      setCollaboratorEmail("")
      setCanEdit(false)
    } catch (error: any) {
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Share className="h-5 w-5" />
                <span className="sr-only">Share</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Share Whiteboard</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="w-[calc(100%-32px)] max-w-md p-4 md:p-6 max-h-[calc(100vh-64px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Whiteboard</DialogTitle>
          <DialogDescription>Share your whiteboard with others or make it public</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="share-link" className="mt-2">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1">
            <TabsTrigger value="share-link" className="text-sm py-2">Share Link</TabsTrigger>
            <TabsTrigger value="collaborators" className="text-sm py-2">Collaborators</TabsTrigger>
          </TabsList>
          <TabsContent value="share-link" className="mt-4 space-y-4">
            <div className="grid gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="link" className="text-sm">Share Link</Label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <Input
                    id="link"
                    readOnly
                    value={shareLink}
                    className="h-9 md:h-10 flex-1 text-sm"
                  />
                  <Button
                    onClick={handleCopyLink}
                    className="w-full sm:w-24 h-9 md:h-10 text-sm"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-sm">Public Access</Label>
                  <span className="text-xs text-muted-foreground">
                    Anyone with the link can view this whiteboard
                  </span>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={handleTogglePublic}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="collaborators" className="mt-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              <form onSubmit={handleAddCollaborator} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Add Collaborator</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={collaboratorEmail}
                    onChange={(e) => setCollaboratorEmail(e.target.value)}
                    className="h-9"
                    required
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="canEdit"
                      checked={canEdit}
                      onCheckedChange={setCanEdit}
                    />
                    <Label htmlFor="canEdit" className="text-sm">Can edit</Label>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !collaboratorEmail}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
              </form>
              <CollaboratorList 
                whiteboardId={whiteboardId} 
                collaborators={collaborators}
                setCollaborators={setCollaborators}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

