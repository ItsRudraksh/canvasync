"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  const handleSendOTP = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/profile/send-delete-otp", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to send verification code");
      }

      setShowOtpInput(true);
      toast.success("Verification code sent to your email");
    } catch (error) {
      toast.error("Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndDelete = async () => {
    try {
      setIsLoading(true);

      // First verify OTP
      const verifyResponse = await fetch("/api/profile/verify-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp }),
      });

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        throw new Error(data.error || "Invalid verification code");
      }

      // Then delete account
      const deleteResponse = await fetch("/api/profile", {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        throw new Error("Failed to delete account");
      }

      toast.success("Account deleted successfully");
      await signOut({ callbackUrl: "/" });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setShowOtpInput(false);
    setOtp("");
  };

  return (
    <div className="border-t mt-8 pt-8">
      <h2 className="text-xl font-semibold text-destructive mb-4">Delete Account</h2>
      <p className="text-muted-foreground mb-4">
        Once you delete your account, all of your whiteboards and data will be permanently removed.
        This action cannot be undone.
      </p>
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isLoading}>
            {isLoading ? "Processing..." : !showOtpInput ? "Delete Account" : "Verify OTP"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {!showOtpInput ? (
                <>
                  This action cannot be undone. This will permanently delete your account
                  and remove all your whiteboards and data from our servers.
                  
                  To proceed, we'll send a verification code to your email.
                </>
              ) : (
                <>
                  Please enter the verification code sent to your email to confirm account deletion.
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      pattern="[0-9]{6}"
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            {!showOtpInput ? (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleSendOTP}
                disabled={isLoading}
              >
                Send Verification Code
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleVerifyAndDelete}
                disabled={isLoading || !otp || otp.length !== 6}
              >
                Verify & Delete Account
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 