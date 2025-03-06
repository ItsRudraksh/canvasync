"use client";

import React from "react";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/aceternity/aurora-background";
import { TracingBeam } from "@/components/aceternity/tracing-beam";
import { LampContainer } from "@/components/aceternity/lamp";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
  showTracingBeam?: boolean;
  showLamp?: boolean;
}

export function AuthLayout({ 
  children, 
  showTracingBeam = true,
  showLamp = false
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Content and visuals */}
      <div className="hidden md:flex md:w-1/2 relative">
        <AuroraBackground className="bg-black">
          <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-8">
            {showLamp ? (
              <LampContainer className="h-full">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="flex flex-col items-center"
                >
                  <Link href="/" className="mb-8">
                    <Image 
                      src="/logo.svg" 
                      alt="CanvaSync Logo" 
                      width={120} 
                      height={120} 
                      className="invert"
                    />
                  </Link>
                  <h1 className="text-4xl md:text-5xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-400 mb-4">
                    CanvaSync
                  </h1>
                  <p className="text-center text-xl text-neutral-300 max-w-md">
                    Where Ideas Flow and Collaboration Grows
                  </p>
                  
                  <div className="mt-12 space-y-4 text-center">
                    <div className="flex items-center space-x-2 text-neutral-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Real-time collaboration</span>
                    </div>
                    <div className="flex items-center space-x-2 text-neutral-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Infinite canvas</span>
                    </div>
                    <div className="flex items-center space-x-2 text-neutral-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Smart drawing tools</span>
                    </div>
                  </div>
                </motion.div>
              </LampContainer>
            ) : showTracingBeam ? (
              <TracingBeam className="px-6">
                <div className="max-w-2xl mx-auto">
                  <Link href="/" className="block mb-12 mx-auto w-fit">
                    <Image 
                      src="/logo.svg" 
                      alt="CanvaSync Logo" 
                      width={120} 
                      height={120} 
                      className="invert"
                    />
                  </Link>
                  
                  <div className="mb-8">
                    <h2 className="text-white text-xl font-medium mb-2">Welcome to CanvaSync</h2>
                    <p className="text-neutral-300">
                      The collaborative whiteboard platform designed for teams to create, share, and innovate together.
                    </p>
                  </div>
                  
                  <div className="space-y-10">
                    <div>
                      <h3 className="text-white text-lg font-medium mb-2">Real-time Collaboration</h3>
                      <p className="text-neutral-400">
                        Work together with your team in real-time, seeing changes instantly no matter where they are located.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-white text-lg font-medium mb-2">Infinite Canvas</h3>
                      <p className="text-neutral-400">
                        Never run out of space with our infinite digital canvas that adapts to your creative needs.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-white text-lg font-medium mb-2">Smart Drawing Tools</h3>
                      <p className="text-neutral-400">
                        Access a wide range of intelligent drawing and annotation tools that adapt to your style.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-white text-lg font-medium mb-2">Cloud Sync</h3>
                      <p className="text-neutral-400">
                        Your work is automatically saved and accessible from any device, anytime, anywhere.
                      </p>
                    </div>
                  </div>
                </div>
              </TracingBeam>
            ) : (
              <div className="max-w-md text-center">
                <Link href="/" className="block mb-8 mx-auto w-fit">
                  <Image 
                    src="/logo.svg" 
                    alt="CanvaSync Logo" 
                    width={120} 
                    height={120} 
                    className="invert"
                  />
                </Link>
                <h1 className="text-4xl font-bold text-white mb-4">CanvaSync</h1>
                <p className="text-xl text-neutral-300">
                  Where Ideas Flow and Collaboration Grows
                </p>
              </div>
            )}
          </div>
        </AuroraBackground>
      </div>
      
      {/* Right side - Auth form */}
      <div className={cn(
        "flex flex-col items-center justify-center w-full p-4 bg-black",
        "md:w-1/2"
      )}>
        {children}
      </div>
    </div>
  );
} 