"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface HoldToStopBarProps {
  onStop: () => void;
  holdDuration?: number; // ms to hold before stopping
  audioLevel?: number; // 0-1, real-time mic amplitude
}

const BAR_COUNT = 5;

// Each bar gets a slightly different multiplier so they look organic
const BAR_MULTIPLIERS = [0.6, 0.85, 1.0, 0.75, 0.55];

export function HoldToStopBar({
  onStop,
  holdDuration = 1500,
  audioLevel = 0,
}: HoldToStopBarProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  // Smoothed audio level for fluid animation
  const [smoothLevel, setSmoothLevel] = useState(0);
  useEffect(() => {
    // Ease toward the target level — fast attack, slow decay
    const attack = 0.5;
    const decay = 0.15;
    setSmoothLevel((prev) => {
      const factor = audioLevel > prev ? attack : decay;
      return prev + (audioLevel - prev) * factor;
    });
  }, [audioLevel]);

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
          {/* Live sound wave bars */}
          <div className="flex h-6 items-center gap-[3px]">
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              // When holding to stop, flatten bars
              const barLevel = isHolding ? 0 : smoothLevel * BAR_MULTIPLIERS[i];
              // Min height 4px, max 22px
              const height = 4 + barLevel * 18;
              return (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-foreground"
                  style={{
                    height: `${height}px`,
                    transition: "height 0.08s ease-out",
                  }}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium text-foreground">
            Hold to stop
          </span>
        </div>
      </div>
    </div>
  );
}
