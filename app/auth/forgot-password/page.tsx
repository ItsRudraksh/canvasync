"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AuthForm } from "@/components/auth-form"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  const validatePassword = (password: string) => {
    const errors = []
    if (password.length < 8) errors.push("Password must be at least 8 characters")
    if ((password.match(/[A-Z]/g) || []).length < 2) errors.push("Password must contain at least two uppercase letters")
    if ((password.match(/[a-z]/g) || []).length < 2) errors.push("Password must contain at least two lowercase letters")
    if ((password.match(/[0-9]/g) || []).length < 2) errors.push("Password must contain at least two numbers")
    if ((password.match(/[^A-Za-z0-9]/g) || []).length < 2) errors.push("Password must contain at least two special characters")
    return errors
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value
    setPassword(newPassword)
    const errors = validatePassword(newPassword)
    setPasswordErrors(errors)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (!showOtpInput) {
        // Step 1: Request password reset
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Something went wrong")
        }

        setShowOtpInput(true)
        toast.success("If an account exists with this email, you will receive a verification code")
      } else if (!showPasswordInput) {
        // Step 2: Verify OTP
        if (otp.length !== 6) {
          setError("Please enter a valid 6-digit code")
          setIsLoading(false)
          return
        }
        setShowPasswordInput(true)
      } else {
        // Step 3: Reset password
        const errors = validatePassword(password)
        if (errors.length > 0) {
          setPasswordErrors(errors)
          errors.forEach(error => toast.error(error))
          setIsLoading(false)
          return
        }

        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
            password,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Something went wrong")
        }

        toast.success("Password reset successfully!")
        router.push("/auth/login?reset=true")
      }
    } catch (error: any) {
      setError(error.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-white dark:bg-zinc-900">
      <AuthForm
        type="forgot-password"
        onSubmit={handleSubmit}
        error={error}
        isLoading={isLoading}
        email={email}
        setEmail={setEmail}
        password={password}
        otp={otp}
        setOtp={setOtp}
        showOtpInput={showOtpInput}
        showPasswordInput={showPasswordInput}
        passwordErrors={passwordErrors}
        handlePasswordChange={handlePasswordChange}
      />
    </div>
  )
} 