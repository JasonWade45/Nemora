"use client";

import { useRef, useState, useEffect } from "react";

interface SignaturePadProps {
  onSign: (dataUrl: string) => void;
  onClear?: () => void;
  className?: string;
  width?: number;
  height?: number;
}

export function SignaturePad({
  onSign,
  onClear,
  className = "",
  width = 320,
  height = 150,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  function getPos(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const t = e.touches[0];
      return {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setDrawing(true);
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  }

  function endDraw() {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current!;
    onSign(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
    onClear?.();
  }

  return (
    <div className={className}>
      <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-slate-400">asser here</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-slate-500">
          {hasSignature ? "تم التوقيع ✓" : "ارسم التوقيع أعلاه"}
        </span>
        {hasSignature && (
          <button
            type="button"
            onClick={clear}
            className="text-[11px] text-red-600 hover:text-red-700 font-medium"
          >
            مسح وإعادة
          </button>
        )}
      </div>
    </div>
  );
}
