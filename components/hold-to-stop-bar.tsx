"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface HoldToStopBarProps {
  onStop: () => void;
  holdDuration?: number; // ms to hold before stopping
}

export function HoldToStopBar({
  onStop,
  holdDuration = 1500,
}: HoldToStopBarProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const updateProgress = useCallback(() => {
    if (!holdStartRef.current || stoppedRef.current) return;

    const elapsed = Date.now() - holdStartRef.current;
    const newProgress = Math.min(1, elapsed / holdDuration);
    setProgress(newProgress);

    if (newProgress >= 1) {
      stoppedRef.current = true;
      setIsHolding(false);
      setProgress(0);
      onStop();
      return;
    }

    animFrameRef.current = requestAnimationFrame(updateProgress);
  }, [holdDuration, onStop]);

  const handlePressStart = useCallback(() => {
    stoppedRef.current = false;
    holdStartRef.current = Date.now();
    setIsHolding(true);
    animFrameRef.current = requestAnimationFrame(updateProgress);
  }, [updateProgress]);

  const handlePressEnd = useCallback(() => {
    holdStartRef.current = null;
    setIsHolding(false);
    setProgress(0);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-8 pt-4">
      <div
        className="relative flex h-14 items-center justify-center overflow-hidden rounded-2xl bg-surface"
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
      >
        {/* Red progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-danger/80 transition-none"
          style={{ width: `${progress * 100}%` }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center gap-3">
          {/* Animated sound wave */}
          <div className="flex h-5 items-center gap-[3px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-foreground"
                style={{
                  height: isHolding ? "8px" : undefined,
                  animation: isHolding
                    ? "none"
                    : `soundWave 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-foreground">
            Hold to stop
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes soundWave {
          0% {
            height: 6px;
          }
          100% {
            height: 20px;
          }
        }
      `}</style>
    </div>
  );
}
