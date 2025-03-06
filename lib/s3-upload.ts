import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper function to extract key from S3 URL
export function getKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Remove the leading slash
    return urlObj.pathname.slice(1);
  } catch {
    return null;
  }
}

// Function to delete an object from S3
export async function deleteFromS3(url: string): Promise<boolean> {
  try {
    const key = getKeyFromUrl(url);
    if (!key) return false;

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.MY_AWS_S3_BUCKET_NAME!,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error("Error deleting from S3:", error);
    return false;
  }
}

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  contentType: string,
  previousAvatarUrl?: string | null
): Promise<string> {
  // Delete previous avatar if it exists
  if (previousAvatarUrl) {
    await deleteFromS3(previousAvatarUrl);
  }

  const key = `avatars/${Date.now()}-${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.MY_AWS_S3_BUCKET_NAME!,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return `https://${process.env.MY_AWS_S3_BUCKET_NAME}.s3.${process.env.MY_AWS_REGION}.amazonaws.com/${key}`;
}
