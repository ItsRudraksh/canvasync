import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { WhiteboardEditor } from "@/components/whiteboard/whiteboard-editor"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { HeaderMenuWrapper } from "@/components/whiteboard/header-menu-wrapper"

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

export default async function SharedWhiteboardPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { auth?: string }
}) {
  const session = await getServerSession(authOptions)

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

  // Check if the whiteboard is public or if the user has access
  const isPublic = whiteboard.isPublic
  const hasAccess =
    session &&
    (whiteboard.userId === session.user.id || whiteboard.collaborators.some((c) => c.userId === session.user.id))

  if (!isPublic && !hasAccess) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">This whiteboard is private. You need to be invited to view it.</p>
          {searchParams.auth === "required" ? (
            <div className="mt-6">
              <p className="mb-4">Please log in to access this whiteboard</p>
              <Link href="/auth/login">
                <Button>Login</Button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // Determine if the user can edit
  const canEdit =
    session &&
    (whiteboard.userId === session.user.id ||
      whiteboard.collaborators.some((c) => c.userId === session.user.id && c.canEdit))

  // Create a user object that matches the expected type if session exists
  const currentUser = session?.user ? {
    id: session.user.id,
    name: session.user.name || "Anonymous",
    email: session.user.email || "anonymous@example.com"
  } : undefined;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div>
          <h1 className="text-lg font-semibold">{whiteboard.title}</h1>
          <p className="text-sm text-muted-foreground">Created by {whiteboard.user.name}</p>
        </div>
        <div className="flex items-center gap-4">
          {session && canEdit && (
            <Link href={`/whiteboard/${whiteboard.id}`}>
              <Button>Edit Whiteboard</Button>
            </Link>
          )}
          {!session && (
            <Link href="/auth/login">
              <Button variant="outline">Login</Button>
            </Link>
          )}
          <HeaderMenuWrapper />
        </div>
      </header>
      <main className="flex-1">
        <WhiteboardEditor
          id={whiteboard.id}
          initialData={whiteboard.content}
          isReadOnly={!canEdit}
          currentUser={currentUser}
          showExportInToolbar={false}
        />
      </main>
    </div>
  )
} 