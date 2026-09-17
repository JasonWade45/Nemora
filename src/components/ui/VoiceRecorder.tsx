"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Icon, icons } from "@/components/ui/Icons";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export function VoiceRecorder({ onTranscript, placeholder = "اضغط للتسجيل الصوتي...", className = "" }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("المتصفح لا يدعم التسجيل الصوتي");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-EG";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => {
          const newText = prev ? prev + " " + finalTranscript : finalTranscript;
          return newText;
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setError("الرجاء السماح بالوصول للمايكروفون");
      } else if (event.error === "network") {
        setError("خطأ في الشبكة - تأكد من الاتصال بالإنترنت");
      } else {
        setError("خطأ في التسجيل: " + event.error);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setError(null);
  }, [isRecording]);

  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  if (!isSupported) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleRecording}
          className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 shrink-0 ${
            isRecording
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Icon d={isRecording ? icons.close : icons.phone} size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-slate-500 mb-0.5">
            {isRecording ? (
              <span className="text-red-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                جاري التسجيل...
              </span>
            ) : (
              placeholder
            )}
          </div>
          {transcript && (
            <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2 mt-1 max-h-20 overflow-y-auto">
              {transcript}
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="text-[10px] text-red-600 mt-1">{error}</div>
      )}
    </div>
  );
}
