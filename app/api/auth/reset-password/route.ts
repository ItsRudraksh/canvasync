import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { verifyOTP } from "@/lib/email";
import { hash } from "bcryptjs";

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z].*[A-Z]/, "Password must contain at least two uppercase letters")
    .regex(/[a-z].*[a-z]/, "Password must contain at least two lowercase letters")
    .regex(/[0-9].*[0-9]/, "Password must contain at least two numbers")
    .regex(/[^A-Za-z0-9].*[^A-Za-z0-9]/, "Password must contain at least two special characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp, password } = resetPasswordSchema.parse(body);

    // Verify OTP
    const isValid = await verifyOTP(email, otp);
    if (!isValid) {
      return NextResponse.json({ message: "Invalid or expired verification code" }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await hash(password, 10);

    // Update user's password
    await db.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ 
      message: "Password reset successfully" 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
    }

    console.error("Error in reset password route:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 