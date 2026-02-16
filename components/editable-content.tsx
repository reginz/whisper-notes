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

  // Auto-resize textarea using scrollHeight
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || isRecording) return;
    textarea.style.height = "0";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content, isRecording]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="min-h-[200px] px-4 py-4 text-[16px] leading-relaxed">
      {isRecording ? (
        /* Single flow div during recording — no height jumps */
        <div className="whitespace-pre-wrap break-words text-foreground">
          {content}
          {streamingText && (
            <>
              {content ? "\n" : ""}
              <StreamingText text={streamingText} />
            </>
          )}
          {!content && !streamingText && (
            <span className="text-text-secondary">Listening...</span>
          )}
        </div>
      ) : (
        /* Editable textarea when not recording */
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="Start typing or tap the mic..."
          className="w-full resize-none overflow-hidden bg-transparent text-[16px] leading-relaxed text-foreground placeholder-text-secondary outline-none"
          rows={1}
        />
      )}
    </div>
  );
}
