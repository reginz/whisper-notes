"use client";

import { useRef, useEffect, useState } from "react";

interface StreamingTextProps {
  text: string;
}

export function StreamingText({ text }: StreamingTextProps) {
  const prevLenRef = useRef(0);
  const [chars, setChars] = useState<{ char: string; id: number }[]>([]);
  const idCounter = useRef(0);

  useEffect(() => {
    if (!text) {
      setChars([]);
      prevLenRef.current = 0;
      return;
    }

    const prevLen = prevLenRef.current;
    const newLen = text.length;

    if (newLen > prevLen) {
      // New characters arrived — add them with unique ids
      const incoming = text
        .slice(prevLen)
        .split("")
        .map((char) => ({
          char,
          id: idCounter.current++,
        }));
      setChars((prev) => [...prev, ...incoming]);
    } else {
      // Text was replaced (new turn) — rebuild all
      setChars(
        text.split("").map((char) => ({
          char,
          id: idCounter.current++,
        }))
      );
    }

    prevLenRef.current = newLen;
  }, [text]);

  if (!text) return null;

  return (
    <span>
      {chars.map(({ char, id }) => (
        <span
          key={id}
          className="animate-charFadeIn text-text-secondary"
        >
          {char}
        </span>
      ))}
      <span className="ml-[1px] inline-block h-[1.1em] w-[2px] translate-y-[2px] animate-blink bg-text-secondary/70" />
    </span>
  );
}
