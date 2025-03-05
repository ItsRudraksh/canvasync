import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import { verifyOTP } from "@/lib/email"

const verifySchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  tempId: z.string(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, otp, tempId } = verifySchema.parse(body)

    // Verify OTP
    const isValid = await verifyOTP(email, otp)
    if (!isValid) {
      return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 })
    }

    // Decode user data from tempId
    let userData
    try {
      userData = JSON.parse(Buffer.from(tempId, 'base64').toString())
    } catch (error) {
      return NextResponse.json({ message: "Invalid session" }, { status: 400 })
    }

    // Create user
    const user = await db.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: userData.hashedPassword,
      },
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ 
      user: userWithoutPassword, 
      message: "Email verified and account created successfully" 
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 })
    }

    console.error("Error in verify route:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
} 