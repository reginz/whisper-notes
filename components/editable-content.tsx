"use client";

import { useCallback, useRef, useEffect } from "react";
import { StreamingText } from "./streaming-text";

interface EditableContentProps {
  content: string;
  streamingText?: string;
  isRecording?: boolean;
  onChange: (content: string) => void;
}

export function EditableContent({
  content,
  streamingText,
  isRecording,
  onChange,
}: EditableContentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [content, adjustHeight]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      adjustHeight();
    },
    [onChange, adjustHeight]
  );

  return (
    <div className="min-h-[200px] px-4 py-4">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          readOnly={isRecording}
          placeholder={isRecording ? "" : "Start typing or tap the mic..."}
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-foreground placeholder-text-secondary outline-none"
          rows={1}
        />
        {isRecording && streamingText && (
          <div className="mt-1 text-[16px] leading-relaxed">
            <StreamingText text={streamingText} />
          </div>
        )}
      </div>
    </div>
  );
}
