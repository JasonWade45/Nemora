"use client";

import { useState, useRef, useEffect } from "react";
import { Icon, icons } from "@/components/ui/Icons";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export function VoiceRecorder({
  onTranscript,
  placeholder = "اضغط للتسجيل الصوتي...",
  className = "",
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef("");

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setIsSupported(false);
    return () => {
      try { recognitionRef.current?.abort(); } catch {}
    };
  }, []);

  function startRecording() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("المتصفح لا يدعم التسجيل الصوتي");
      return;
    }

    finalTextRef.current = transcript;

    const recognition = new SR();
    recognition.lang = "ar-EG";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let lastFinal = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = lastFinal;

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
          lastFinal = final;
        } else {
          interim += result[0].transcript;
        }
      }

      const display = final + interim;
      finalTextRef.current = final;
      setTranscript(display);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("الرجاء السماح بالوصول للمايكروفون");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (finalTextRef.current) {
        onTranscript(finalTextRef.current);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
      setError(null);
    } catch {
      setError("فشل بدء التسجيل");
    }
  }

  function stopRecording() {
    try {
      recognitionRef.current?.abort();
    } catch {}
    setIsRecording(false);
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  if (!isSupported) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleRecording}
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 shrink-0 ${
            isRecording
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Icon d={isRecording ? icons.close : icons.phone} size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-slate-500">
            {isRecording ? (
              <span className="text-red-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                جاري التسجيل... اضغط للإيقاف
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
