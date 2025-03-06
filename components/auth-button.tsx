"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MovingBorder } from "@/components/aceternity/moving-border";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "secondary";
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function AuthButton({ 
  children, 
  className, 
  variant = "default",
  isLoading,
  fullWidth = true,
  ...props 
}: AuthButtonProps) {
  if (variant === "default") {
    return (
      <MovingBorder
        borderRadius="0.5rem"
        className={cn("p-[1px]", fullWidth && "w-full")}
      >
        <Button
          className={cn(
            "relative bg-black/50 text-white border-0 backdrop-blur-sm hover:bg-black/70 transition-colors",
            fullWidth && "w-full",
            className
          )}
          disabled={isLoading || props.disabled}
          {...props}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          ) : (
            children
          )}
        </Button>
      </MovingBorder>
    );
  }
  
  return (
    <Button
      className={cn(
        "bg-white/5 text-white hover:bg-white/10 border-white/10 backdrop-blur-sm transition-colors",
        fullWidth && "w-full",
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </div>
      ) : (
        children
      )}
    </Button>
  );
} 