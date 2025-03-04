import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { uploadToS3 } from "@/lib/s3-upload";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Get the current user with their avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    console.log("Uploading file to S3:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      previousAvatar: currentUser?.avatar
    });

    // Upload to S3 and delete previous avatar if it exists
    const avatarUrl = await uploadToS3(
      buffer, 
      file.name, 
      file.type,
      currentUser?.avatar
    );
    
    console.log("File uploaded successfully to:", avatarUrl);

    // Update user's avatar in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: avatarUrl }
    });

    console.log("User avatar updated in database:", updatedUser);

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    const errorMessage = error instanceof Error ? error.message : "Error uploading avatar";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 