"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";

type ExamTimerProps = {
  initialSeconds: number; 
  limitSeconds: number; 
  onTimeUpdate: (seconds: number) => void;
  onTimeOver?: () => void;
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}

export function ExamTimer({ initialSeconds, limitSeconds, onTimeUpdate, onTimeOver }: ExamTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const syncingFromProp = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const firedTimeOverRef = useRef(false);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev >= limitSeconds) {
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [limitSeconds]);

  useEffect(() => {
    if (!Number.isFinite(initialSeconds)) return;
    setSeconds((prev) => {
      if (prev === initialSeconds) return prev;
      syncingFromProp.current = true;
      return initialSeconds;
    });
  }, [initialSeconds]);

  useEffect(() => {
    if (seconds >= limitSeconds) {
      if (!firedTimeOverRef.current && onTimeOver) {
        firedTimeOverRef.current = true;
        onTimeOver();
      }
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    if (syncingFromProp.current) {
      syncingFromProp.current = false;
      return;
    }
    onTimeUpdate(seconds);
  }, [seconds, limitSeconds, onTimeOver, onTimeUpdate]);

  const remaining = useMemo(() => Math.max(limitSeconds - seconds, 0), [limitSeconds, seconds]);
  const warn = useMemo(() => remaining <= Math.floor(limitSeconds * 0.25), [remaining, limitSeconds]);
  const danger = useMemo(
    () => remaining <= Math.min(120, limitSeconds * 0.05),
    [remaining, limitSeconds],
  );

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-2 ${
        danger
          ? "bg-destructive/10 text-destructive"
          : warn
            ? "bg-yellow-50 text-yellow-700"
            : "bg-secondary text-muted-foreground"
      }`}
    >
      <Clock className="h-4 w-4" />
      <span className="text-sm font-mono font-semibold">
        Tiempo restante: {formatTime(remaining)}
      </span>
    </div>
  );
}
