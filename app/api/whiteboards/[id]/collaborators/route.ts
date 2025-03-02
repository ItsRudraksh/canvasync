import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const collaboratorSchema = z.object({
  email: z.string().email("Invalid email address"),
  canEdit: z.boolean().default(false),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const { email, canEdit } = collaboratorSchema.parse(body)

    // Check if user is owner
    const whiteboard = await db.whiteboard.findUnique({
      where: { id },
    })

    if (!whiteboard) {
      return NextResponse.json({ message: "Whiteboard not found" }, { status: 404 })
    }

    if (whiteboard.userId !== session.user.id) {
      return NextResponse.json({ message: "Only the owner can add collaborators" }, { status: 401 })
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Check if user is already a collaborator
    const existingCollaborator = await db.collaborator.findFirst({
      where: {
        whiteboardId: id,
        userId: user.id,
      },
    })

    if (existingCollaborator) {
      // Update existing collaborator
      const updatedCollaborator = await db.collaborator.update({
        where: {
          id: existingCollaborator.id,
        },
        data: {
          canEdit,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return NextResponse.json(updatedCollaborator)
    }

    // Create new collaborator
    const collaborator = await db.collaborator.create({
      data: {
        whiteboardId: id,
        userId: user.id,
        canEdit,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(collaborator)
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
    const url = new URL(req.url)
    const collaboratorId = url.searchParams.get("collaboratorId")

    if (!collaboratorId) {
      return NextResponse.json({ message: "Collaborator ID is required" }, { status: 400 })
    }

    // Check if user is owner
    const whiteboard = await db.whiteboard.findUnique({
      where: { id },
    })

    if (!whiteboard) {
      return NextResponse.json({ message: "Whiteboard not found" }, { status: 404 })
    }

    if (whiteboard.userId !== session.user.id) {
      return NextResponse.json({ message: "Only the owner can remove collaborators" }, { status: 401 })
    }

    // Delete collaborator
    await db.collaborator.delete({
      where: { id: collaboratorId },
    })

    return NextResponse.json({ message: "Collaborator removed" })
  } catch (error) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

