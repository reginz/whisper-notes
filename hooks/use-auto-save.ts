"use client";

import { useCallback, useEffect, useRef } from "react";

export function useAutoSave(
  save: (content: string) => Promise<void>,
  delay: number = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestContentRef = useRef<string>("");
  const isSavingRef = useRef(false);

  const debouncedSave = useCallback(
    (content: string) => {
      latestContentRef.current = content;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        try {
          await save(latestContentRef.current);
        } finally {
          isSavingRef.current = false;
        }
      }, delay);
    },
    [save, delay]
  );

  // Save on unmount if there's pending content
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // Fire the save immediately on cleanup
        save(latestContentRef.current);
      }
    };
  }, [save]);

  // Flush: save immediately
  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await save(latestContentRef.current);
  }, [save]);

  return { debouncedSave, flush };
}
