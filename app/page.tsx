import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserButton } from "@/components/auth/user-button"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PlusCircle } from "lucide-react"
import { WhiteboardList } from "@/components/whiteboard/whiteboard-list"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return redirect("/auth/login")
  }

  const whiteboards = await db.whiteboard.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        {
          collaborators: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl font-bold">Whiteboard</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <UserButton />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Whiteboards</h1>
          <Link href="/whiteboard/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Whiteboard
            </Button>
          </Link>
        </div>
        <div className="mt-8">
          <WhiteboardList whiteboards={whiteboards} />
        </div>
      </main>
    </div>
  )
}

