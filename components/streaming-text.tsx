"use client";

interface StreamingTextProps {
  text: string;
}

export function StreamingText({ text }: StreamingTextProps) {
  if (!text) return null;

  return (
    <span className="text-accent animate-pulse" style={{ animationDuration: "2s" }}>
      {text}
    </span>
  );
}
