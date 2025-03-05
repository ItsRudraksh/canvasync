import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateOTP, sendDeletionEmail, storeOTP } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(session.user.email, otp);

    // Send verification email
    await sendDeletionEmail(session.user.email, otp);

    return NextResponse.json({ 
      message: "Verification code sent to your email",
      email: session.user.email
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
} 