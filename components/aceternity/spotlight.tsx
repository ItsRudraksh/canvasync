"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";

interface SpotlightProps {
  className?: string;
  children?: React.ReactNode;
}

export function Spotlight({
  children,
  className = "",
}: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useRef(0);
  const mouseY = useRef(0);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseX.current = x;
      mouseY.current = y;
      
      // Update CSS variables
      container.style.setProperty("--mouse-x", `${x}px`);
      container.style.setProperty("--mouse-y", `${y}px`);
    };

    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isMounted]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-md bg-background",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-10 h-full w-full bg-[radial-gradient(circle_at_var(--mouse-x,_0px)_var(--mouse-y,_0px),rgba(var(--spotlight-color,255,255,255),0.1),transparent_40%)]" />
      <div className="relative z-0">{children}</div>
    </div>
  );
} 