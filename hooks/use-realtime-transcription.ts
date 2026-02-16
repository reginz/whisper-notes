"use client";

import { useCallback, useRef, useState } from "react";

// #region agent log
const DEBUG_URL = 'http://127.0.0.1:7243/ingest/eae86fc7-99da-4989-b69a-e6469bff39ae';
function dbg(location: string, message: string, data: Record<string, unknown>, hypothesisId: string) {
  fetch(DEBUG_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location, message, data, hypothesisId, timestamp: Date.now() }) }).catch(() => {});
}
// #endregion

type TranscriptionState =
  | "idle"
  | "connecting"
  | "recording"
  | "stopping"
  | "error";

interface UseRealtimeTranscriptionOptions {
  onTranscriptDelta?: (delta: string) => void;
  onTranscriptComplete?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useRealtimeTranscription(
  options: UseRealtimeTranscriptionOptions = {}
) {
  const [state, setState] = useState<TranscriptionState>("idle");
  const [streamingText, setStreamingText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const fullTranscriptRef = useRef("");
  const pendingSamplesRef = useRef(0);
  const MIN_COMMIT_SAMPLES = 2400; // 100ms at 24kHz
  const audioChunkCountRef = useRef(0);

  const cleanup = useCallback(() => {
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState("connecting");
      setStreamingText("");
      fullTranscriptRef.current = "";
      pendingSamplesRef.current = 0;
      audioChunkCountRef.current = 0;

      // 1. Get ephemeral token from our API
      const tokenRes = await fetch("/api/realtime-token", { method: "POST" });
      if (!tokenRes.ok) {
        throw new Error("Failed to get transcription token");
      }
      const { token } = await tokenRes.json();

      if (!token) {
        throw new Error("No token received");
      }

      // 2. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // #region agent log
      const micTrack = stream.getAudioTracks()[0];
      const micSettings = micTrack?.getSettings();
      dbg('hook:95', 'Mic stream acquired', { micSampleRate: micSettings?.sampleRate, micChannelCount: micSettings?.channelCount, micDeviceId: micSettings?.deviceId }, 'H1');
      // #endregion

      // 3. Connect to OpenAI Realtime API (GA endpoint)
      const ws = new WebSocket("wss://api.openai.com/v1/realtime", [
        "realtime",
        `openai-insecure-api-key.${token}`,
      ]);
      wsRef.current = ws;

      ws.onopen = () => {
        // Session is preconfigured by /api/realtime-token via client_secrets.
        setState("recording");

        // 4. Set up audio processing
        const audioContext = new AudioContext({ sampleRate: 24000 });
        audioContextRef.current = audioContext;

        // Ensure AudioContext is running (browsers may start it suspended)
        if (audioContext.state === "suspended") {
          audioContext.resume();
        }

        // #region agent log
        dbg('hook:113', 'AudioContext created', { actualSampleRate: audioContext.sampleRate, requestedSampleRate: 24000, state: audioContext.state }, 'H1');
        // #endregion

        const source = audioContext.createMediaStreamSource(stream);
        // Use ScriptProcessorNode for broad compatibility
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          audioChunkCountRef.current++;

          // Compute RMS audio level (0-1) for visualisation
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          // Amplify and clamp to 0-1 (phone mic RMS is often 0.002-0.05)
          const level = Math.min(1, rms * 35);
          setAudioLevel(level);

          // #region agent log
          if (audioChunkCountRef.current <= 3 || audioChunkCountRef.current % 50 === 0) {
            // Check a few samples to see if audio is silent
            let maxAbs = 0;
            let nonZeroCount = 0;
            for (let i = 0; i < inputData.length; i++) {
              const abs = Math.abs(inputData[i]);
              if (abs > maxAbs) maxAbs = abs;
              if (abs > 0.001) nonZeroCount++;
            }
            dbg('hook:130', 'Audio chunk', {
              chunkNum: audioChunkCountRef.current,
              bufferLength: inputData.length,
              sampleRate: e.inputBuffer.sampleRate,
              maxAmplitude: maxAbs,
              nonZeroSamples: nonZeroCount,
              totalSamples: inputData.length,
              base64SampleLength: 0, // will be set below
            }, 'H2');
          }
          // #endregion

          // Convert float32 to int16 PCM
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          // Convert to base64
          const bytes = new Uint8Array(pcm16.buffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Audio = btoa(binary);

          ws.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64Audio,
            })
          );
          pendingSamplesRef.current += inputData.length;
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // #region agent log
          // Log ALL events to understand what we receive
          dbg('hook:170', 'WS event received', { type: data.type, hasTranscript: !!data.transcript, hasDelta: !!data.delta, errorMsg: data.error?.message }, 'H3');
          // #endregion

          // #region agent log
          if (data.type === "session.created" || data.type === "session.updated") {
            dbg('hook:175', 'Session config from API', { sessionType: data.session?.type, transcriptionModel: data.session?.audio?.input?.transcription?.model, fullSession: JSON.stringify(data.session) }, 'H6');
          }
          // #endregion

          // Log all events for debugging
          if (data.type !== "input_audio_buffer.speech_started" &&
              data.type !== "input_audio_buffer.speech_stopped") {
            console.log("Realtime event:", data.type, data);
          }

          // Transcription delta (streaming text)
          if (
            data.type ===
            "conversation.item.input_audio_transcription.delta"
          ) {
            const delta = data.delta || "";
            // gpt-4o-transcribe sends incremental deltas — append
            fullTranscriptRef.current += delta;
            setStreamingText(fullTranscriptRef.current);
            options.onTranscriptDelta?.(delta);

            // #region agent log
            dbg('hook:190', 'Transcription delta received', { delta, fullTranscript: fullTranscriptRef.current }, 'H5');
            // #endregion
          }

          // Transcription failed
          if (
            data.type ===
            "conversation.item.input_audio_transcription.failed"
          ) {
            // #region agent log
            dbg('hook:205', 'Transcription FAILED', { fullEvent: JSON.stringify(data) }, 'H6');
            // #endregion
            console.error("Transcription failed:", data);
          }

          // Transcription completed (turn finished)
          if (
            data.type ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            const transcript = data.transcript || fullTranscriptRef.current;

            // #region agent log
            dbg('hook:201', 'Transcription completed', { transcript }, 'H5');
            // #endregion

            fullTranscriptRef.current = "";
            setStreamingText("");
            options.onTranscriptComplete?.(transcript);
          }

          if (data.type === "input_audio_buffer.committed") {
            pendingSamplesRef.current = 0;
          }

          if (data.type === "error") {
            const errMsg = data.error?.message || "";
            // "buffer too small" is benign — it means VAD already committed
            if (!errMsg.includes("buffer too small")) {
              console.error("Realtime API error:", data.error);
              options.onError?.(errMsg || "Transcription error");
            }
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        // #region agent log
        dbg('hook:225', 'WebSocket error', { readyState: ws.readyState }, 'H3');
        // #endregion
        setState("error");
        options.onError?.("Connection error");
        cleanup();
      };

      ws.onclose = (event) => {
        // #region agent log
        dbg('hook:233', 'WebSocket closed', { code: event.code, reason: event.reason, totalChunksSent: audioChunkCountRef.current }, 'H3');
        // #endregion
        if (state === "recording") {
          setState("idle");
        }
      };
    } catch (error) {
      console.error("Recording error:", error);
      setState("error");
      options.onError?.(
        error instanceof Error ? error.message : "Failed to start recording"
      );
      cleanup();

      // Reset error state after a delay
      setTimeout(() => setState("idle"), 3000);
    }
  }, [options, cleanup, state]);

  const stopRecording = useCallback(() => {
    setState("stopping");

    // #region agent log
    dbg('hook:254', 'Stop recording called', { pendingSamples: pendingSamplesRef.current, minRequired: MIN_COMMIT_SAMPLES, totalChunks: audioChunkCountRef.current }, 'H2');
    // #endregion

    // 1. Stop audio processing first so we stop sending new data
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // 2. Don't manually commit — server_vad auto-commits on speech end.
    //    Manual commits cause "buffer too small" if VAD already consumed it.

    // 3. Wait for any in-flight transcription to finish, then close WS
    setTimeout(() => {
      const finalText = fullTranscriptRef.current;

      // Close WebSocket (audio resources already cleaned above)
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      setState("idle");
      setStreamingText("");
      pendingSamplesRef.current = 0;

      if (finalText) {
        options.onTranscriptComplete?.(finalText);
      }
    }, 1000);
  }, [cleanup, options]);

  return {
    state,
    streamingText,
    audioLevel,
    startRecording,
    stopRecording,
  };
}
