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
import { MobileTabs } from "@/components/dashboard/mobile-tabs"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard | CanvaSync",
  description: "Manage your whiteboards and collaborations in CanvaSync",
}

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

  const [myWhiteboards, sharedWhiteboards, publicWhiteboards] = await Promise.all([
    db.whiteboard.findMany({
      where: {
        userId: session.user.id,
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
        collaborators: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        collaborators: {
          where: {
            userId: session.user.id,
          },
          select: {
            canEdit: true,
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold sm:text-2xl">Your Whiteboards</h1>
          <Link href="/whiteboard/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Whiteboard
            </Button>
          </Link>
        </div>
        
        {/* Mobile Tabs */}
        <MobileTabs 
          myWhiteboards={myWhiteboards}
          sharedWhiteboards={sharedWhiteboards}
          publicWhiteboards={publicWhiteboards}
        />
        
        {/* Desktop Tabs */}
        <div className="hidden sm:block mt-8">
          <Tabs defaultValue="my-whiteboards">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="my-whiteboards" className="flex-1 sm:flex-none">My Whiteboards</TabsTrigger>
              <TabsTrigger value="shared-whiteboards" className="flex-1 sm:flex-none">Shared with Me</TabsTrigger>
              <TabsTrigger value="public-whiteboards" className="flex-1 sm:flex-none">Public Whiteboards</TabsTrigger>
            </TabsList>
            <TabsContent value="my-whiteboards" className="mt-6">
              <WhiteboardList whiteboards={myWhiteboards} showOwner={false} listType="my" />
            </TabsContent>
            <TabsContent value="shared-whiteboards" className="mt-6">
              <WhiteboardList whiteboards={sharedWhiteboards} showOwner={true} showAccessLevel={true} listType="shared" />
            </TabsContent>
            <TabsContent value="public-whiteboards" className="mt-6">
              <WhiteboardList whiteboards={publicWhiteboards} showOwner={true} listType="public" />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
} 