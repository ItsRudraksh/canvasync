"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react"
import { FcGoogle } from "react-icons/fc"

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    try {
      setIsLoading(true)
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch (error) {
      console.error("Error signing in with Google", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      type="button"
      disabled={isLoading}
      className="w-full"
      onClick={handleSignIn}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Signing in...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <FcGoogle className="h-5 w-5" />
          <span>Sign in with Google</span>
        </div>
      )}
    </Button>
  )
} 