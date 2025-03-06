import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { WhiteboardClient } from "@/components/whiteboard/whiteboard-client"
import { Metadata } from "next"

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const whiteboard = await db.whiteboard.findUnique({
    where: { id: params.id },
    select: { title: true }
  })

  return {
    title: `${whiteboard?.title || 'Whiteboard'} | CanvaSync`,
    description: `Collaborate in real-time on ${whiteboard?.title || 'this whiteboard'} with CanvaSync`,
  }
}

export default async function WhiteboardPage({ params }: Props) {
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