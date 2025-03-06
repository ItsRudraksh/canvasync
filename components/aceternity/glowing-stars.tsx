"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Star {
  id: number;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  duration: number;
  delay: number;
}

export function GlowingStarsBackground({
  className,
  quantity = 50,
  maxRadius = 2,
  minRadius = 0.5,
  colors = ["#FFF", "#FFD700", "#FFA500"],
  children,
}: {
  className?: string;
  quantity?: number;
  maxRadius?: number;
  minRadius?: number;
  colors?: string[];
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, [mounted]);

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    const newStars: Star[] = [];
    for (let i = 0; i < quantity; i++) {
      newStars.push({
        id: i,
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        radius: Math.random() * (maxRadius - minRadius) + minRadius,
        opacity: Math.random() * 0.8 + 0.2,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 2,
      });
    }
    setStars(newStars);
  }, [dimensions, quantity, maxRadius, minRadius]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: star.x,
              top: star.y,
              width: star.radius * 2,
              height: star.radius * 2,
              backgroundColor: colors[Math.floor(Math.random() * colors.length)],
              boxShadow: `0 0 ${star.radius * 2}px ${star.radius}px ${
                colors[Math.floor(Math.random() * colors.length)]
              }`,
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, star.opacity, 0],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
} 