"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Icon, icons } from "@/components/ui/Icons";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

export function VoiceRecorder({
  onTranscript,
  placeholder = "اضغط للتسجيل الصوتي...",
  className = "",
  maxLength = 60,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const spokenChunksRef = useRef<Set<string>>(new Set());
  const finalTextRef = useRef("");

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setIsSupported(false);
    return () => stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    } catch {}
    setIsRecording(false);
    setDuration(0);
    spokenChunksRef.current = new Set();
    finalTextRef.current = "";
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("المتصفح لا يدعم التسجيل الصوتي");
      return;
    }

    // Start fresh
    finalTextRef.current = transcript;
    spokenChunksRef.current = new Set();

    const recognition = new SR();
    recognition.lang = "ar-EG";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let lastProcessedIndex = 0;

    recognition.onresult = (event: any) => {
      let newFinal = finalTextRef.current;

      for (let i = lastProcessedIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result[0]) continue;

        const text = result[0].transcript;

        if (result.isFinal) {
          // Use a hash-like check: first 10 chars + length
          const key = text.trim().substring(0, 20) + "|" + text.trim().length;
          if (!spokenChunksRef.current.has(key)) {
            spokenChunksRef.current.add(key);
            newFinal = newFinal ? newFinal + " " + text.trim() : text.trim();
          }
        }
      }

      lastProcessedIndex = event.results.length;
      finalTextRef.current = newFinal;
      setTranscript(newFinal);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("الرجاء السماح بالوصول للمايكروفون");
      }
      stopRecording();
    };

    recognition.onend = () => {
      // Auto-stop — don't restart
      if (isRecording) {
        stopRecording();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
      setError(null);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev + 1 >= maxLength) {
            stopRecording();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError("فشل بدء التسجيل");
      stopRecording();
    }
  }

  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  if (!isSupported) return null;

  const progress = duration / maxLength;

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleRecording}
          className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 shrink-0 ${
            isRecording
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {isRecording && (
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="17" fill="none" stroke="white" strokeWidth="3"
                strokeDasharray={106.8}
                strokeDashoffset={106.8 * (1 - progress)}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
          )}
          <Icon d={isRecording ? icons.close : icons.phone} size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-slate-500">
            {isRecording ? (
              <span className="text-red-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                جاري التسجيل... {duration}s / {maxLength}s
              </span>
            ) : transcript ? (
              <span className="text-green-600 font-medium">تم التسجيل ✓</span>
            ) : (
              placeholder
            )}
          </div>
          {transcript && (
            <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2 mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap">
              {transcript}
            </div>
          )}
        </div>
      </div>
      {error && <div className="text-[10px] text-red-600 mt-1">{error}</div>}
    </div>
  );
}
