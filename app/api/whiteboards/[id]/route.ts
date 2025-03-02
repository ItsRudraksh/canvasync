import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const updateSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isPublic: z.boolean().optional(),
})

// Schema for saving whiteboard content
const saveContentSchema = z.object({
  content: z.string(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = params

    const whiteboard = await db.whiteboard.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!whiteboard) {
      return NextResponse.json({ message: "Whiteboard not found" }, { status: 404 })
    }

    // Check if the whiteboard is public or if the user has access
    const isPublic = whiteboard.isPublic
    const hasAccess =
      session &&
      (whiteboard.userId === session.user.id || whiteboard.collaborators.some((c) => c.userId === session.user.id))

    if (!isPublic && !hasAccess) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(whiteboard)
  } catch (error) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const { content } = saveContentSchema.parse(body)

    // Check if user is owner or collaborator with edit access
    const whiteboard = await db.whiteboard.findUnique({
      where: { id },
      include: {
        collaborators: true,
      },
    })

    if (!whiteboard) {
      return NextResponse.json({ message: "Whiteboard not found" }, { status: 404 })
    }

    const isOwner = whiteboard.userId === session.user.id
    const isCollaborator = whiteboard.collaborators.some(
      (collaborator) => collaborator.userId === session.user.id && collaborator.canEdit,
    )

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const updatedWhiteboard = await db.whiteboard.update({
      where: { id },
      data: {
        content,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updatedWhiteboard)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 })
    }

    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const { title, content, isPublic } = updateSchema.parse(body)

    // Check if user is owner or collaborator with edit access
    const whiteboard = await db.whiteboard.findUnique({
      where: { id },
      include: {
        collaborators: true,
      },
    })

    if (!whiteboard) {
      return NextResponse.json({ message: "Whiteboard not found" }, { status: 404 })
    }

    const isOwner = whiteboard.userId === session.user.id
    const isCollaborator = whiteboard.collaborators.some(
      (collaborator) => collaborator.userId === session.user.id && collaborator.canEdit,
    )

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const updatedWhiteboard = await db.whiteboard.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(isPublic !== undefined && { isPublic }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updatedWhiteboard)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 })
    }

    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    // Check if user is owner
    const whiteboard = await db.whiteboard.findUnique({
      where: { id },
    })

    if (!whiteboard) {
      return NextResponse.json({ message: "Whiteboard not found" }, { status: 404 })
    }

    if (whiteboard.userId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Delete collaborators first
    await db.collaborator.deleteMany({
      where: { whiteboardId: id },
    })

    // Delete whiteboard
    await db.whiteboard.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Whiteboard deleted" })
  } catch (error) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

