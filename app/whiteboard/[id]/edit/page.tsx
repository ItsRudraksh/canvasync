import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { WhiteboardForm } from "@/components/whiteboard/whiteboard-form"

export default async function EditWhiteboardPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return redirect("/auth/login")
  }

  const whiteboard = await db.whiteboard.findUnique({
    where: {
      id: params.id,
    },
  })

  if (!whiteboard) {
    return redirect("/")
  }

  // Check if user is owner
  if (whiteboard.userId !== session.user.id) {
    return redirect(`/whiteboard/${params.id}`)
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="mb-8 text-2xl font-bold">Edit Whiteboard</h1>
      <WhiteboardForm whiteboard={whiteboard} />
    </div>
  )
} 