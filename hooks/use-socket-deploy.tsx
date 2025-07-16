"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

/**
 * Creates a socket connection that works with both development and production environments
 * Handles fallback strategies for connecting to WebSocket server
 */
function createSocketConnection() {
  // Get the WebSocket URL from environment variables or use a default
  // Replace with your actual deployed WebSocket server URL
  const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "https://your-deployed-socket-url";

  // Options for Socket.IO connection
  const options = {
    transports: ["polling"], // Try both transports
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 60000, // Increase timeout
    forceNew: true, // Force a new connection
    path: "/socket.io/", // Explicitly set the path
  };

  // Create the socket connection
  return io(SOCKET_URL, options);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  useEffect(() => {
    // Create the socket connection
    const socketInstance = createSocketConnection();

    socketInstance.on("connect", () => {
      console.log("Socket connected successfully");
      setIsConnected(true);
      setConnectionAttempts(0); // Reset connection attempts on successful connection
    });

    socketInstance.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);

      // Track connection attempts
      setConnectionAttempts((prev) => prev + 1);

      // If we've tried multiple times and still can't connect, try alternative methods
      if (connectionAttempts >= 2) {
        console.log("Trying alternative connection methods...");

        // Try connecting through HTTPS if we're on an HTTPS site
        if (
          typeof window !== "undefined" &&
          window.location.protocol === "https:"
        ) {
          // Get the current URL from the socket options
          const currentUrl =
            process.env.NEXT_PUBLIC_SOCKET_URL ||
            "https://your-deployed-socket-url";

          if (currentUrl.startsWith("http://")) {
            console.log("Switching to secure connection...");

            // Disconnect the current socket
            socketInstance.disconnect();

            // Create a new socket with HTTPS
            const secureUrl = currentUrl.replace("http://", "https://");
            const secureOptions = {
              ...socketInstance.io.opts,
              secure: true,
            };

            // Create a new socket with the secure URL
            const secureSocket = io(secureUrl, secureOptions);
            setSocket(secureSocket);

            // Clean up the original socket
            return () => {
              secureSocket.disconnect();
            };
          }
        }
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [connectionAttempts]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

// Helper function to determine if we're in a development environment
export const isDevelopment = () => {
  return process.env.NODE_ENV === "development";
};

// Helper function to get the appropriate WebSocket URL based on environment
export const getSocketUrl = () => {
  if (isDevelopment()) {
    return process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080";
  } else {
    return (
      process.env.NEXT_PUBLIC_SOCKET_URL || "https://your-deployed-socket-url"
    );
  }
};
