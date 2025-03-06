"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function MovingBorder({
  children,
  duration = 2000,
  className,
  containerClassName,
  borderRadius = "1.75rem",
  colors = ["#171717", "#171717"],
  as: Component = "button",
  ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  className?: string;
  containerClassName?: string;
  borderRadius?: string;
  colors?: string[];
  as?: any;
  [key: string]: any;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const borderVariants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          duration: 2,
          ease: "easeInOut",
        },
        opacity: {
          duration: 0.5,
        },
      },
    },
  };

  return (
    <Component
      className={cn(
        "relative p-[1px] overflow-hidden",
        containerClassName
      )}
      onMouseMove={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isMounted) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }}
      {...otherProps}
    >
      <div
        className="absolute inset-0 z-10"
        style={{
          borderRadius,
        }}
      >
        <div
          className="absolute inset-0 z-10"
          style={{
            background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${colors[0]} 0%, ${colors[1]} 50%, transparent 100%)`,
          }}
        />
      </div>

      <motion.div
        className="absolute inset-0 z-10"
        style={{
          borderRadius,
        }}
        initial="hidden"
        animate="visible"
      >
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            filter: "blur(1px)",
          }}
        >
          <motion.path
            d="M0,0 L100,0 L100,100 L0,100 Z"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="2"
            variants={borderVariants}
          />
          <defs>
            <linearGradient id="gradient" gradientTransform={`rotate(${position.x / 3})`}>
              <stop stopColor="#18CCFC" />
              <stop offset="1" stopColor="#6344F5" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      <div
        className={cn("relative z-20", className)}
        style={{
          borderRadius: `calc(${borderRadius} - 1px)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
} 