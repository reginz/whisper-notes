"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useYap } from "@/hooks/use-yaps";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useRealtimeTranscription } from "@/hooks/use-realtime-transcription";
import { EditableContent } from "@/components/editable-content";
import { RecordFAB } from "@/components/record-fab";
import { HoldToStopBar } from "@/components/hold-to-stop-bar";

function YapDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const shouldRecord = searchParams.get("record") === "true";

  const { yap, loading, updateContent } = useYap(id);
  const [localContent, setLocalContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const autoRecordTriggered = useRef(false);

  // Auto-save on edits
  const { debouncedSave } = useAutoSave(updateContent, 1000);

  // Transcription hook
  const {
    state: recordingState,
    streamingText,
    startRecording,
    stopRecording,
  } = useRealtimeTranscription({
    onTranscriptComplete: (transcript) => {
      // Use functional updater to always get latest content (avoids stale closure)
      setLocalContent((prev) => {
        const newContent = prev ? `${prev}\n${transcript}` : transcript;
        debouncedSave(newContent);
        return newContent;
      });
    },
    onTranscriptDelta: () => {
      // Deltas are handled via streamingText state
    },
    onError: (err) => {
      setError(err);
      setTimeout(() => setError(null), 3000);
    },
  });

  // Initialize local content from fetched yap
  useEffect(() => {
    if (yap && !hasInitialized.current) {
      setLocalContent(yap.content);
      hasInitialized.current = true;
    }
  }, [yap]);

  // Auto-start recording if navigated with ?record=true
  useEffect(() => {
    if (
      shouldRecord &&
      !autoRecordTriggered.current &&
      hasInitialized.current &&
      recordingState === "idle"
    ) {
      autoRecordTriggered.current = true;
      startRecording();
    }
  }, [shouldRecord, recordingState, startRecording]);

  const handleContentChange = useCallback(
    (content: string) => {
      setLocalContent(content);
      debouncedSave(content);
    },
    [debouncedSave]
  );

  const handleRecord = useCallback(() => {
    if (recordingState === "idle") {
      startRecording();
    }
  }, [recordingState, startRecording]);

  const handleStop = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const isRecording =
    recordingState === "recording" || recordingState === "connecting";

  // Format date
  const dateStr = yap
    ? new Date(yap.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }) +
      " at " +
      new Date(yap.created_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (!yap) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-text-secondary">Yap not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="px-4 pb-2 pt-4">
        <button
          onClick={() => router.push("/yaps")}
          className="flex items-center gap-1 text-accent"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          <span className="text-base font-medium">Yaps</span>
        </button>
      </div>

      {/* Date */}
      <div className="px-4 pb-4 text-center">
        <p className="text-sm text-text-secondary">{dateStr}</p>
      </div>

      {/* Content */}
      <EditableContent
        content={localContent}
        streamingText={streamingText}
        isRecording={isRecording}
        onChange={handleContentChange}
      />

      {/* Error toast */}
      {error && (
        <div className="fixed left-4 right-4 top-16 z-50 rounded-xl bg-danger/90 px-4 py-3 text-center text-sm text-white">
          {error}
        </div>
      )}

      {/* Recording UI */}
      {recordingState === "recording" || recordingState === "stopping" ? (
        <HoldToStopBar onStop={handleStop} />
      ) : (
        <RecordFAB
          onClick={handleRecord}
          isConnecting={recordingState === "connecting"}
        />
      )}
    </div>
  );
}

export default function YapDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <div className="text-text-secondary">Loading...</div>
        </div>
      }
    >
      <YapDetailContent />
    </Suspense>
  );
}
