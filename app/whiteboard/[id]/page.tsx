import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { WhiteboardEditor } from "@/components/whiteboard/whiteboard-editor"
import { ShareButton } from "@/components/whiteboard/share-button"
import { HeaderMenuWrapper } from "@/components/whiteboard/header-menu-wrapper"
import { UserCounts } from "@/components/whiteboard/user-counts"

// Extend the session type to include the id property
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

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
    <div className="flex h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">{whiteboard.title}</h1>
          <UserCounts 
            whiteboardId={whiteboard.id} 
            canEdit={isOwner || isCollaborator} 
            currentUser={{
              id: currentUser.id,
              name: currentUser.name,
            }}
          />
        </div>
        <div className="flex items-center gap-4">
          {(isOwner || isCollaborator) && <ShareButton whiteboardId={whiteboard.id} />}
          <HeaderMenuWrapper />
        </div>
      </header>
      <main className="flex-1">
        <WhiteboardEditor
          id={whiteboard.id}
          initialData={whiteboard.content}
          isReadOnly={isReadOnly}
          currentUser={currentUser}
          showExportInToolbar={false}
        />
      </main>
    </div>
  )
} 