"use client";

import React, { useState } from "react";
import { EnhancedInput } from "@/components/ui/enhanced-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";

interface AuthFormProps {
  type: "login" | "register" | "forgot-password";
  onSubmit: (e: React.FormEvent) => Promise<void>;
  error?: string;
  isLoading?: boolean;
  // Login & Register
  email?: string;
  setEmail?: (value: string) => void;
  password?: string;
  setPassword?: (value: string) => void;
  // Register only
  name?: string;
  setName?: (value: string) => void;
  // Forgot password & Register
  otp?: string;
  setOtp?: (value: string) => void;
  showOtpInput?: boolean;
  showPasswordInput?: boolean;
  // Password validation
  passwordErrors?: string[];
  handlePasswordChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AuthForm({
  type,
  onSubmit,
  error,
  isLoading = false,
  email = "",
  setEmail = () => { },
  password = "",
  setPassword = () => { },
  name = "",
  setName = () => { },
  otp = "",
  setOtp = () => { },
  showOtpInput = false,
  showPasswordInput = false,
  passwordErrors = [],
  handlePasswordChange = () => { },
}: AuthFormProps) {
  const getTitle = () => {
    if (type === "login") return "Welcome back";
    if (type === "register") {
      if (showOtpInput) return "Verify your email";
      return "Create an account";
    }
    if (type === "forgot-password") {
      if (!showOtpInput) return "Reset password";
      if (!showPasswordInput) return "Verify code";
      return "Create new password";
    }
    return "";
  };

  const getDescription = () => {
    if (type === "login") return "Enter your credentials to access your account";
    if (type === "register") {
      if (showOtpInput) return "Enter the verification code sent to your email";
      return "Enter your information to create an account";
    }
    if (type === "forgot-password") {
      if (!showOtpInput) return "Enter your email to receive a verification code";
      if (!showPasswordInput) return "Enter the verification code sent to your email";
      return "Enter your new password";
    }
    return "";
  };

  const getButtonText = () => {
    if (isLoading) return "Processing...";
    if (type === "login") return "Sign in";
    if (type === "register") {
      if (showOtpInput) return "Verify email";
      return "Create account";
    }
    if (type === "forgot-password") {
      if (!showOtpInput) return "Send reset code";
      if (!showPasswordInput) return "Verify code";
      return "Reset password";
    }
    return "";
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{getTitle()}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{getDescription()}</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Register - Name field */}
        {type === "register" && !showOtpInput && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <EnhancedInput
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}

        {/* Login, Register, Forgot Password - Email field */}
        {((type === "login") ||
          (type === "register" && !showOtpInput) ||
          (type === "forgot-password" && !showOtpInput)) && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <EnhancedInput
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          )}

        {/* Login, Register - Password field */}
        {((type === "login") ||
          (type === "register" && !showOtpInput) ||
          (type === "forgot-password" && showPasswordInput)) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {type === "login" && (
                  <Link href="/auth/forgot-password" className="text-sm text-blue-500 hover:text-blue-700">
                    Forgot password?
                  </Link>
                )}
              </div>
              <EnhancedInput
                id="password"
                type="password"
                value={password}
                onChange={type === "register" || (type === "forgot-password" && showPasswordInput)
                  ? handlePasswordChange
                  : (e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />

              {/* Password requirements for Register and Reset Password */}
              {((type === "register" && !showOtpInput) ||
                (type === "forgot-password" && showPasswordInput)) &&
                passwordErrors.length > 0 && (
                  <p className="text-sm text-red-500 mt-1">{passwordErrors[0]}</p>
                )}

              {/* Password requirements checklist */}
              {((type === "register" && !showOtpInput) ||
                (type === "forgot-password" && showPasswordInput)) && (
                  <div className="mt-2 space-y-1 text-sm text-neutral-500">
                    <p>Password must contain:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                      <li className={cn(password.length >= 8 ? "text-green-500" : "")}>
                        At least 8 characters
                      </li>
                      <li className={cn((password.match(/[A-Z]/g) || []).length >= 2 ? "text-green-500" : "")}>
                        At least two uppercase letters
                      </li>
                      <li className={cn((password.match(/[a-z]/g) || []).length >= 2 ? "text-green-500" : "")}>
                        At least two lowercase letters
                      </li>
                      <li className={cn((password.match(/[0-9]/g) || []).length >= 2 ? "text-green-500" : "")}>
                        At least two numbers
                      </li>
                      <li className={cn((password.match(/[^A-Za-z0-9]/g) || []).length >= 2 ? "text-green-500" : "")}>
                        At least two special characters
                      </li>
                    </ul>
                  </div>
                )}
            </div>
          )}

        {/* OTP Input for Register and Forgot Password */}
        {((type === "register" && showOtpInput) ||
          (type === "forgot-password" && showOtpInput && !showPasswordInput)) && (
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <EnhancedInput
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
          )}

        <Button
          type="submit"
          className="w-full mt-6"
          disabled={isLoading}
        >
          {getButtonText()}
        </Button>
      </form>

      {/* Add the Google sign-in option for login and register */}
      {(type === "login" || type === "register" && !showOtpInput) && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-zinc-900 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>
          <GoogleSignInButton />
        </>
      )}

      <div className="mt-6 text-center text-sm">
        {type === "login" ? (
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-blue-500 hover:text-blue-700">
              Sign up
            </Link>
          </p>
        ) : type === "register" ? (
          <p>
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-500 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        ) : (
          <p>
            Remember your password?{" "}
            <Link href="/auth/login" className="text-blue-500 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
} 