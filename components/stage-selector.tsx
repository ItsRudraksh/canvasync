"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StageSelector() {
  const [stage, setStage] = useState("3");

  // Apply the stage class to the document body
  useEffect(() => {
    // Remove all stage classes
    document.body.classList.remove("app-stage-1", "app-stage-2", "app-stage-3");

    // Add the current stage class
    document.body.classList.add(`app-stage-${stage}`);

    // Store the current stage in localStorage
    localStorage.setItem("app-stage", stage);
  }, [stage]);

  // Load the saved stage from localStorage on component mount
  useEffect(() => {
    const savedStage = localStorage.getItem("app-stage");
    if (savedStage) {
      setStage(savedStage);
    }
  }, []);

  return (
    <div className="hidden fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border bg-background p-2 shadow-lg">
      <span className="text-xs font-medium">App Stage:</span>
      <Select value={stage} onValueChange={setStage}>
        <SelectTrigger className="h-8 w-24">
          <SelectValue placeholder="Stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Stage 1</SelectItem>
          <SelectItem value="2">Stage 2</SelectItem>
          <SelectItem value="3">Stage 3</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
