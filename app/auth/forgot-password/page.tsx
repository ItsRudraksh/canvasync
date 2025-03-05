"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {!showOtpInput 
              ? "Enter your email to receive a verification code"
              : !showPasswordInput
              ? "Enter the verification code sent to your email"
              : "Enter your new password"
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!showOtpInput ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            ) : !showPasswordInput ? (
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  disabled={isLoading}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  disabled={isLoading}
                  className={cn(
                    passwordErrors.length > 0 && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Password must contain:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>At least 8 characters</li>
                    <li>At least two uppercase letters</li>
                    <li>At least two lowercase letters</li>
                    <li>At least two numbers</li>
                    <li>At least two special characters</li>
                  </ul>
                  {passwordErrors.length > 0 && (
                    <div className="mt-2">
                      {passwordErrors.map((error, index) => (
                        <p key={index} className="text-sm text-red-500">
                          • {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading 
                ? "Processing..." 
                : !showOtpInput 
                ? "Send Reset Code"
                : !showPasswordInput
                ? "Verify Code"
                : "Reset Password"
              }
            </Button>
            <div className="text-center text-sm">
              Remember your password?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 