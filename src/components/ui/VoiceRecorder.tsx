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
  const lastResultIndexRef = useRef(0);
  const finalTextRef = useRef("");

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setIsSupported(false);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setIsRecording(false);
    setDuration(0);
    lastResultIndexRef.current = 0;
    finalTextRef.current = "";
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      cleanup();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("المتصفح لا يدعم التسجيل الصوتي");
      return;
    }

    finalTextRef.current = transcript;
    lastResultIndexRef.current = 0;

    const recognition = new SR();
    recognition.lang = "ar-EG";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let newText = finalTextRef.current;

      for (let i = lastResultIndexRef.current; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const spokenText = result[0].transcript.trim();
          // Only add if it's not a duplicate of the last few words
          if (!newText.endsWith(spokenText)) {
            newText = newText ? newText + " " + spokenText : spokenText;
          }
        }
      }

      lastResultIndexRef.current = event.results.length;
      finalTextRef.current = newText;
      setTranscript(newText);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech error:", event.error);
      if (event.error === "not-allowed") {
        setError("الرجاء السماح بالوصول للمايكروفون");
      } else if (event.error === "aborted" || event.error === "no-speech") {
        // ignore
      } else {
        setError("خطأ: " + event.error);
      }
      cleanup();
    };

    recognition.onend = () => {
      cleanup();
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
      setError(null);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxLength) {
            cleanup();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e: any) {
      setError("فشل بدء التسجيل");
      cleanup();
    }
  }, [isRecording, maxLength, cleanup, transcript]);

  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

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
