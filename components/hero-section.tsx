"use client";

import { motion } from "framer-motion";
import { WavyBackground } from "@/components/aceternity/wavy-background";
import { GlowingStarsBackground } from "@/components/aceternity/glowing-stars";
import { TextReveal } from "@/components/aceternity/text-reveal";
import Link from "next/link";

export function HeroSection() {
  return (
    <WavyBackground
      className="py-20 relative overflow-hidden"
      containerClassName="h-screen flex items-center justify-center"
      colors={["#4f46e5", "#7c3aed", "#d946ef", "#ec4899"]}
      waveWidth={30}
      backgroundFill="rgba(10, 10, 20, 0.8)"
      blur={5}
      speed="slow"
      waveOpacity={1}
      waveStrength={120}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl"></div>
        <div className="absolute top-1/3 right-1/3 w-60 h-60 rounded-full bg-pink-500/10 blur-3xl"></div>
        
        {/* Animated floating elements */}
        <div className="absolute top-1/4 left-1/3 w-6 h-6 rounded-full bg-indigo-500/40 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-8 h-8 rounded-full bg-purple-500/40 animate-bounce"></div>
        <div className="absolute top-2/3 left-1/4 w-4 h-4 rounded-full bg-pink-500/40 animate-ping"></div>
      </div>
      
      <GlowingStarsBackground
        quantity={150}
        className="absolute inset-0"
      />
      
      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Text content */}
          <div className="text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-block px-4 py-1.5 mb-6 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-md border border-indigo-500/20"
            >
              <span className="text-sm font-medium text-indigo-200">Next-Gen Collaborative Whiteboard</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold mb-6"
            >
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200">
                CanvaSync
              </span>
              <span className="block text-3xl md:text-4xl mt-2 text-white/90">
                Where Ideas Flow
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-white/80 mb-8 max-w-xl"
            >
              A powerful digital canvas that brings teams together. Create, collaborate, and innovate in real-time with our intuitive whiteboard platform.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Link 
                href="/auth/login"
                className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-50"
              >
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#6366F1_0%,#D946EF_50%,#6366F1_100%)]" />
                <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-1 text-sm font-medium text-white backdrop-blur-3xl">
                  Get Started
                  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </Link>
              
              <Link
                href="/demo"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white/10 px-8 text-sm font-medium text-white backdrop-blur-md hover:bg-white/20 transition-colors"
              >
                Try Demo
              </Link>
            </motion.div>
            
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap gap-8 mt-12"
            >
              <div>
                <div className="text-3xl font-bold text-white">10k+</div>
                <div className="text-sm text-indigo-200">Active Users</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">5M+</div>
                <div className="text-sm text-purple-200">Whiteboards Created</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-pink-200">Uptime</div>
              </div>
            </motion.div>
          </div>
          
          {/* Right side - Visual element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-square">
              {/* Decorative rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[90%] h-[90%] rounded-full border border-indigo-500/20 animate-[spin_40s_linear_infinite]"></div>
                <div className="absolute w-[70%] h-[70%] rounded-full border border-purple-500/20 animate-[spin_30s_linear_infinite_reverse]"></div>
                <div className="absolute w-[50%] h-[50%] rounded-full border border-pink-500/20 animate-[spin_20s_linear_infinite]"></div>
              </div>
              
              {/* Floating UI elements */}
              <motion.div
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 5,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
                className="absolute top-[10%] right-[5%] w-32 h-24 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-md border border-white/10 flex items-center justify-center"
              >
                <svg className="w-12 h-12 text-indigo-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 16V8C3 5.23858 5.23858 3 8 3H16C18.7614 3 21 5.23858 21 8V16C21 18.7614 18.7614 21 16 21H8C5.23858 21 3 18.7614 3 16Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </motion.div>
              
              <motion.div
                animate={{ 
                  y: [0, 15, 0],
                  rotate: [0, -3, 0],
                  scale: [1, 1.03, 1]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: 1
                }}
                className="absolute bottom-[15%] left-[10%] w-40 h-28 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/10 flex items-center justify-center"
              >
                <svg className="w-14 h-14 text-purple-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L15 11M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
              
              {/* Central element */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    rotate: {
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear"
                    },
                    scale: {
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }
                  }}
                  className="w-40 h-40 rounded-full bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 backdrop-blur-md flex items-center justify-center"
                >
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/40 via-purple-500/40 to-pink-500/40 backdrop-blur-md flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/50 via-purple-500/50 to-pink-500/50 backdrop-blur-md flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </WavyBackground>
  );
} 