"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const TextReveal = ({
  text,
  className,
  once = true,
  delay = 0,
  duration = 0.5,
  ...props
}: {
  text: string;
  className?: string;
  once?: boolean;
  delay?: number;
  duration?: number;
  [key: string]: any;
}) => {
  // Split text into words
  const words = text.split(" ");
  
  return (
    <div className={cn("", className)} {...props}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          className="inline-block mr-1.5"
          initial={{ 
            opacity: 0,
            y: 20,
            filter: "blur(4px)",
          }}
          animate={{ 
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
          }}
          transition={{
            duration: 0.4,
            delay: delay + index * 0.04,
            ease: [0.2, 0.65, 0.3, 0.9],
          }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}; 