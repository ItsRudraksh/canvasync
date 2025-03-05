import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserButton } from "@/components/auth/user-button"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PlusCircle } from "lucide-react"
import { WhiteboardList } from "@/components/whiteboard/whiteboard-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return redirect("/auth/login")
  }

  // Get current user with avatar
  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { avatar: true }
  });

  const [myWhiteboards, publicWhiteboards] = await Promise.all([
    db.whiteboard.findMany({
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
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    db.whiteboard.findMany({
      where: {
        isPublic: true,
        NOT: {
          userId: session.user.id,
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl font-bold">Dashboard</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <UserButton customAvatarUrl={currentUser?.avatar} />
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
        <Tabs defaultValue="my-whiteboards" className="mt-8">
          <TabsList>
            <TabsTrigger value="my-whiteboards">My Whiteboards</TabsTrigger>
            <TabsTrigger value="public-whiteboards">Public Whiteboards</TabsTrigger>
          </TabsList>
          <TabsContent value="my-whiteboards">
            <WhiteboardList whiteboards={myWhiteboards} showOwner={false} />
          </TabsContent>
          <TabsContent value="public-whiteboards">
            <WhiteboardList whiteboards={publicWhiteboards} showOwner={true} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
} 