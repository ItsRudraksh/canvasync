"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

type ProfileFormProps = {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
};

export default function ProfileForm({ user }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to update profile");
      
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      console.log("Uploading file:", file.name);
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }

      console.log("Upload successful:", data);
      
      // Update the avatar URL in state
      if (data.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
        toast.success("Avatar updated successfully");
      } else {
        throw new Error("No avatar URL received");
      }
      
      // Reset the file input
      if (e.target) {
        e.target.value = "";
      }

    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
      setAvatarUrl(null); // Reset to fallback on error
    } finally {
      setIsLoading(false);
    }
  };

  // Add useEffect to log state changes
  useEffect(() => {
    console.log("Avatar URL updated:", avatarUrl);
  }, [avatarUrl]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex flex-col items-center">
        <Avatar className="w-32 h-32">
          {avatarUrl ? (
            <AvatarImage 
              src={avatarUrl} 
              alt={user.name}
              className="object-cover w-full h-full"
              onError={(e) => {
                console.error('Error loading avatar:', e);
                const target = e.target as HTMLImageElement;
                target.src = ''; // Clear the errored image
                setAvatarUrl(null); // Reset to fallback
              }}
            />
          ) : (
            <AvatarFallback className="text-2xl">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="mt-4">
          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => document.getElementById('avatar-upload')?.click()}
          >
            Change Avatar
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Form>
    </div>
  );
} 