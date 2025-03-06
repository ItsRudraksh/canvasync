"use client";

import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

export const Card3D = ({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;
    
    const rotateX = mouseY * 20; // Adjust the multiplier for more/less rotation
    const rotateY = -mouseX * 20; // Negative because we want to rotate towards the mouse
    
    setRotationX(rotateX);
    setRotationY(rotateY);
  };

  const handleMouseLeave = () => {
    setRotationX(0);
    setRotationY(0);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative card-3d-container", containerClassName)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn("w-full h-full card-3d-element", className)}
        style={{
          transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const CardItem = ({
  as: Tag = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
  [key: string]: any;
}) => {
  const transform = `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
  
  return (
    <Tag
      className={cn("card-3d-item", className)}
      style={{
        transform,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}; 