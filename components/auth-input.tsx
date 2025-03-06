"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function AuthInput({ 
  label, 
  error, 
  className, 
  rightElement,
  ...props 
}: AuthInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label 
          htmlFor={props.id} 
          className="text-sm font-medium text-white/80"
        >
          {label}
        </Label>
        {rightElement}
      </div>
      <div className="relative">
        <Input
          className={cn(
            "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 transition-all",
            error && "border-red-500/50 focus-visible:ring-red-500/50 focus-visible:border-red-500/50",
            className
          )}
          {...props}
        />
        <div className="absolute inset-0 rounded-md pointer-events-none bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
} 