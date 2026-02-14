"use client";

import { type Yap } from "@/hooks/use-yaps";
import { useRef, useState, useCallback } from "react";

interface YapCardProps {
  yap: Yap;
  onTap: (id: string) => void;
  onDelete: (id: string) => void;
  isLast?: boolean;
}

export function YapCard({ yap, onTap, onDelete, isLast }: YapCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const preview =
    yap.content.trim().split("\n")[0]?.slice(0, 80) || "Empty yap";
  const time = new Date(yap.created_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isDeleting) return;
      startXRef.current = e.touches[0].clientX;
      isDraggingRef.current = false;
    },
    [isDeleting]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDeleting) return;
      const diff = e.touches[0].clientX - startXRef.current;
      if (diff < -10) {
        isDraggingRef.current = true;
      }
      if (isDraggingRef.current) {
        setOffsetX(Math.min(0, Math.max(-100, diff)));
      }
    },
    [isDeleting]
  );

  const handleTouchEnd = useCallback(() => {
    if (isDeleting) return;
    if (offsetX < -60) {
      setOffsetX(-100);
    } else {
      setOffsetX(0);
    }
  }, [offsetX, isDeleting]);

  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    setTimeout(() => onDelete(yap.id), 300);
  }, [yap.id, onDelete]);

  const handleTap = useCallback(() => {
    if (!isDraggingRef.current && offsetX === 0) {
      onTap(yap.id);
    } else if (offsetX !== 0) {
      setOffsetX(0);
    }
  }, [yap.id, onTap, offsetX]);

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ${
        isDeleting ? "h-0 opacity-0" : ""
      }`}
    >
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 flex w-[100px] items-center justify-center bg-danger">
        <button
          onClick={handleDelete}
          className="flex h-full w-full items-center justify-center text-sm font-medium text-white"
        >
          Delete
        </button>
      </div>

      {/* Card content */}
      <div
        className="relative bg-surface transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
      >
        <div className={`px-4 py-3 ${!isLast ? "border-b border-divider" : ""}`}>
          <p className="truncate text-[15px] text-foreground">{preview}</p>
          <p className="mt-0.5 text-xs text-text-secondary">{time}</p>
        </div>
      </div>
    </div>
  );
}
