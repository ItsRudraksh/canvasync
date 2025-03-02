import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { WhiteboardEditor } from "@/components/whiteboard/whiteboard-editor"
import { ShareButton } from "@/components/whiteboard/share-button"

export default async function WhiteboardPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
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

  // Check if user is owner or collaborator
  const isOwner = whiteboard.userId === session.user.id
  const isCollaborator = whiteboard.collaborators.some(
    (collaborator) => collaborator.userId === session.user.id && collaborator.canEdit,
  )

  // If not owner or collaborator with edit access, redirect to view-only
  if (!isOwner && !isCollaborator && !whiteboard.isPublic) {
    return redirect(`/shared/${params.id}`)
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <h1 className="text-lg font-semibold">{whiteboard.title}</h1>
        <div className="flex items-center gap-4">
          {(isOwner || isCollaborator) && <ShareButton whiteboardId={whiteboard.id} />}
        </div>
      </header>
      <main className="flex-1">
        <WhiteboardEditor
          id={whiteboard.id}
          initialData={whiteboard.content}
          isReadOnly={false}
          currentUser={session.user}
        />
      </main>
    </div>
  )
}

