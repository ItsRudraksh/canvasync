import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import * as z from "zod";
import { deleteFromS3 } from "@/lib/s3-upload";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Check if email is already taken by another user
    if (validatedData.email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already taken" },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: validatedData.name,
        email: validatedData.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data to access avatar URL
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true }
    });

    // Delete avatar from S3 if it exists
    if (user?.avatar) {
      await deleteFromS3(user.avatar);
    }

    // Delete all collaborator entries for user's whiteboards
    await prisma.collaborator.deleteMany({
      where: {
        whiteboard: {
          userId: session.user.id
        }
      }
    });

    // Delete all collaborator entries where user is a collaborator
    await prisma.collaborator.deleteMany({
      where: {
        userId: session.user.id
      }
    });

    // Delete all whiteboards owned by the user
    await prisma.whiteboard.deleteMany({
      where: {
        userId: session.user.id
      }
    });

    // Delete the user
    await prisma.user.delete({
      where: {
        id: session.user.id
      }
    });

    return NextResponse.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting profile:", error);
    return NextResponse.json(
      { error: "Failed to delete profile" },
      { status: 500 }
    );
  }
} 