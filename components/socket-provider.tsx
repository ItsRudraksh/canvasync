"use client";

import React from "react";

// Import both socket providers
import { SocketProvider as LocalSocketProvider } from "@/hooks/use-socket";
import { SocketProvider as DeployedSocketProvider } from "@/hooks/use-socket-deploy";

interface SocketProviderProps {
  children: React.ReactNode;
}

/**
 * Conditional Socket Provider
 * 
 * This component chooses between the local and deployed socket providers
 * based on the NEXT_PUBLIC_USE_DEPLOYED_SOCKET environment variable.
 */
export function SocketProvider({ children }: SocketProviderProps) {
  // Check if we should use the deployed socket server
  const useDeployed = process.env.NEXT_PUBLIC_USE_DEPLOYED_SOCKET === "true";
  
  // Render the appropriate provider
  if (useDeployed) {
    return <DeployedSocketProvider>{children}</DeployedSocketProvider>;
  } else {
    return <LocalSocketProvider>{children}</LocalSocketProvider>;
  }
}

/**
 * Combined Socket Hook
 * 
 * This hook provides a unified interface for both socket providers.
 * It automatically selects the appropriate hook based on the environment.
 */
export function useSocket() {
  // This is a client component, so we need to check if window is defined
  if (typeof window === "undefined") {
    // Return a dummy implementation for server-side rendering
    return {
      socket: null,
      isConnected: false,
    };
  }
  
  // Dynamically import the appropriate hook
  // Note: This approach requires the component using this hook to be a client component
  const useDeployed = process.env.NEXT_PUBLIC_USE_DEPLOYED_SOCKET === "true";
  
  if (useDeployed) {
    // Use the deployed socket hook
    const { useSocket } = require("@/hooks/use-socket-deploy");
    return useSocket();
  } else {
    // Use the local socket hook
    const { useSocket } = require("@/hooks/use-socket");
    return useSocket();
  }
} 