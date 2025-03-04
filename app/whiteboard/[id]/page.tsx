import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { WhiteboardClient } from "@/components/whiteboard/whiteboard-client"

export default async function WhiteboardPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return redirect(`/shared/${params.id}?auth=required`)
  }

  const whiteboard = await db.whiteboard.findUnique({
    where: {
      id: params.id,
    },
    include: {
      user: true,
      collaborators: {
        include: {
          user: true,
        },
      },
    },
  })

  if (!whiteboard) {
    return redirect("/")
  }

  // Create a user object that matches the expected type
  const currentUser = {
    id: session.user.id,
    name: session.user.name || "Anonymous",
    email: session.user.email || "anonymous@example.com"
  };

  // Check if user is owner or collaborator
  const isOwner = whiteboard.userId === currentUser.id
  const isCollaborator = whiteboard.collaborators.some(
    (collaborator) => collaborator.userId === currentUser.id && collaborator.canEdit,
  )

  // If not owner or collaborator with edit access, redirect to view-only
  if (!isOwner && !isCollaborator && !whiteboard.isPublic) {
    return redirect(`/shared/${params.id}`)
  }

  // Determine if the whiteboard should be read-only
  const isReadOnly = !isOwner && !isCollaborator && whiteboard.isPublic

  return (
    <WhiteboardClient
      whiteboard={whiteboard}
      currentUser={currentUser}
      isOwner={isOwner}
      isCollaborator={isCollaborator}
      isReadOnly={isReadOnly}
    />
  )
} 