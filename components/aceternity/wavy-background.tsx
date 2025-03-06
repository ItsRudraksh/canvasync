"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

interface WavyBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
  waveStrength?: number;
  [key: string]: any;
}

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
  waveStrength = 20,
  ...props
}: WavyBackgroundProps) => {
  const noise = createNoise3D();
  let w: number,
    h: number,
    nt: number,
    i: number,
    x: number,
    ctx: any,
    canvas: any;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const getSpeed = () => {
    switch (speed) {
      case "slow":
        return 0.0005;
      case "fast":
        return 0.002;
      default:
        return 0.001;
    }
  };

  const init = () => {
    canvas = canvasRef.current;
    ctx = canvas.getContext("2d");
    w = ctx.canvas.width = window.innerWidth;
    h = ctx.canvas.height = window.innerHeight;
    ctx.filter = `blur(${blur}px)`;
    nt = 0;
    window.onresize = function () {
      w = ctx.canvas.width = window.innerWidth;
      h = ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(${blur}px)`;
    };
    render();
  };

  const waveColors = colors ?? [
    "#4f46e5", // indigo-600
    "#7c3aed", // violet-600
    "#d946ef", // fuchsia-600
    "#ec4899", // pink-600
  ];

  const drawWave = (n: number) => {
    nt += getSpeed();
    for (i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.lineWidth = waveWidth || 50;
      ctx.strokeStyle = waveColors[i % waveColors.length];
      
      // Increase the opacity for better visibility
      ctx.globalAlpha = waveOpacity || 0.8;
      
      for (x = 0; x < w; x += 5) {
        const y = noise(x / 800, 0.3 * i, nt) * (waveStrength || 20);
        ctx.lineTo(x, h * 0.5 + y);
      }
      ctx.stroke();
      ctx.closePath();
    }
  };

  let animationId: number;
  const render = () => {
    ctx.fillStyle = backgroundFill || "rgba(10, 10, 20, 0.8)";
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, w, h);
    drawWave(5); // Increased from 3 to 5 waves for more visibility
    animationId = requestAnimationFrame(render);
  };

  useEffect(() => {
    init();
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div
      className={cn(
        "h-full flex flex-col items-center justify-center",
        containerClassName
      )}
      data-wavy-background
    >
      <canvas
        className="absolute inset-0 z-0"
        ref={canvasRef}
        id="canvas"
        style={{
          width: "100%",
          height: "100%",
        }}
        {...props}
      ></canvas>
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
}; 