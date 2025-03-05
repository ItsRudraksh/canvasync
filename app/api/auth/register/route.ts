import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { z } from "zod"
import { generateOTP, sendVerificationEmail, storeOTP } from "@/lib/email"

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z].*[A-Z]/, "Password must contain at least two uppercase letters")
    .regex(/[a-z].*[a-z]/, "Password must contain at least two lowercase letters")
    .regex(/[0-9].*[0-9]/, "Password must contain at least two numbers")
    .regex(/[^A-Za-z0-9].*[^A-Za-z0-9]/, "Password must contain at least two special characters"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password } = userSchema.parse(body)

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
    }

    try {
      // Generate and store OTP
      const otp = generateOTP()
      await storeOTP(email, otp)

      // Send verification email
      await sendVerificationEmail(email, otp)

      // Hash password
      const hashedPassword = await hash(password, 10)

      // Store user data in session for later use
      const userData = {
        name,
        email,
        hashedPassword,
      }

      return NextResponse.json({ 
        message: "Verification code sent to your email",
        email,
        tempId: Buffer.from(JSON.stringify(userData)).toString('base64')
      }, { status: 200 })
    } catch (error) {
      console.error("Error in registration process:", error);
      throw error; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 })
    }

    console.error("Error in registration route:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

