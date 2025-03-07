import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Ensure the user is requesting their own whiteboards
    if (session.user.id !== params.userId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

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

    return NextResponse.json({
      myWhiteboards,
      sharedWhiteboards,
      publicWhiteboards,
    })
  } catch (error) {
    console.error("[WHITEBOARDS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 