import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateOTP, storeOTP } from "@/lib/email";
import { sendPasswordResetEmail } from "@/lib/email";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      return NextResponse.json({ 
        message: "If an account exists with this email, you will receive a password reset code." 
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(email, otp);

    // Send password reset email
    await sendPasswordResetEmail(email, otp);

    return NextResponse.json({ 
      message: "If an account exists with this email, you will receive a password reset code.",
      email 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    }

    console.error("Error in forgot password route:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 