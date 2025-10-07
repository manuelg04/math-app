"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

type ExamTimerProps = {
  initialSeconds: number;
  onTimeUpdate: (seconds: number) => void;
};

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function ExamTimer({ initialSeconds, onTimeUpdate }: ExamTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    onTimeUpdate(seconds);
  }, [seconds, onTimeUpdate]);

  const isWarning = seconds >= 50 * 60; // 50 minutos
  const isDanger = seconds >= 58 * 60; // 58 minutos

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-2 ${
        isDanger
          ? "bg-destructive/10 text-destructive"
          : isWarning
            ? "bg-yellow-50 text-yellow-700"
            : "bg-secondary text-muted-foreground"
      }`}
    >
      <Clock className="h-4 w-4" />
      <span className="text-sm font-mono font-semibold">{formatTime(seconds)}</span>
    </div>
  );
}
