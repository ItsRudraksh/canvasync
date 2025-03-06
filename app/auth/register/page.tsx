"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AuthForm } from "@/components/auth-form"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [tempId, setTempId] = useState("")

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

    if (showOtpInput) {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
            tempId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Something went wrong")
        }

        toast.success("Account created successfully!")
        router.push("/auth/login?registered=true")
      } catch (error: any) {
        setError(error.message || "Something went wrong")
        setIsLoading(false)
      }
      return
    }

    // Validate password
    const errors = validatePassword(password)
    if (errors.length > 0) {
      setPasswordErrors(errors)
      errors.forEach(error => toast.error(error))
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong")
      }

      setTempId(data.tempId)
      setShowOtpInput(true)
      toast.success("Verification code sent to your email!")
      setIsLoading(false)
    } catch (error: any) {
      setError(error.message || "Something went wrong")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-white dark:bg-zinc-900">
      <AuthForm
        type="register"
        onSubmit={handleSubmit}
        error={error}
        isLoading={isLoading}
        email={email}
        setEmail={setEmail}
        password={password}
        name={name}
        setName={setName}
        otp={otp}
        setOtp={setOtp}
        showOtpInput={showOtpInput}
        passwordErrors={passwordErrors}
        handlePasswordChange={handlePasswordChange}
      />
    </div>
  )
}

