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
import { DashboardClient } from "@/components/dashboard/dashboard-client"
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
    <DashboardClient 
      currentUser={currentUser}
      myWhiteboards={myWhiteboards}
      sharedWhiteboards={sharedWhiteboards}
      publicWhiteboards={publicWhiteboards}
      userId={session.user.id}
    />
  )
} 