"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spotlight } from "@/components/aceternity/spotlight";
import { GlowingStarsBackground } from "@/components/aceternity/glowing-stars";
import { MovingBorder } from "@/components/aceternity/moving-border";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <GlowingStarsBackground
        quantity={50}
        className="absolute inset-0 opacity-50"
      />
      
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 rounded-full bg-purple-500/5 blur-3xl"></div>
      </div>
      
      <Spotlight
        className="hidden md:block"
        fill="rgba(124, 58, 237, 0.05)"
      />
      
      {/* Card with moving border */}
      <div className="w-full max-w-md relative z-10">
        <MovingBorder
          borderRadius="1rem"
          className="p-[1px] bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent"
        >
          <Card className="w-full backdrop-blur-sm bg-black/40 border-0">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200">
                {title}
              </CardTitle>
              <CardDescription className="text-center text-white/60">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {children}
            </CardContent>
            {footer && (
              <CardFooter className={cn("flex flex-col space-y-4", !footer && "hidden")}>
                {footer}
              </CardFooter>
            )}
          </Card>
        </MovingBorder>
      </div>
    </div>
  );
} 