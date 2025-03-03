import type React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/session-provider";
import { SocketProvider } from "@/hooks/use-socket";
import { StageSelector } from "@/components/stage-selector";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collaborative Whiteboard",
  description: "A real-time collaborative whiteboard application",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SocketProvider>
              <StageSelector />
              {children}
              <Toaster />
            </SocketProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

import "./globals.css";
