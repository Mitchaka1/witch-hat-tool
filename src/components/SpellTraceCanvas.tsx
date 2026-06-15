"use client";

import Image from "next/image";
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import type { DemoSpell } from "@/data/demoSpells";
import {
  scoreCircleQuality,
  type CircleQualityResult,
  type TracePoint,
} from "@/lib/circleQuality";

const CANVAS_SIZE = 520;

type SpellTraceCanvasProps = {
  spell: DemoSpell;
  onQualityChange: (result: CircleQualityResult | null) => void;
};

export default function SpellTraceCanvas({
  spell,
  onQualityChange,
}: SpellTraceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<TracePoint[]>([]);
  const [drawing, setDrawing] = useState(false);

  const redraw = useCallback((points: readonly TracePoint[]) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (points.length < 2) return;

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.strokeStyle = "#2b2117";
    context.lineWidth = 7;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = "rgba(74, 63, 134, 0.28)";
    context.shadowBlur = 5;
    context.stroke();
  }, []);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * CANVAS_SIZE,
      y: ((event.clientY - bounds.top) / bounds.height) * CANVAS_SIZE,
    };
  };

  const clear = useCallback(() => {
    pointsRef.current = [];
    redraw([]);
    onQualityChange(null);
  }, [onQualityChange, redraw]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointsRef.current = [pointFromEvent(event)];
    setDrawing(true);
    onQualityChange(null);
    redraw(pointsRef.current);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (!drawing) return;

    pointsRef.current = [...pointsRef.current, pointFromEvent(event)];
    redraw(pointsRef.current);
  };

  const finishTrace = () => {
    if (!drawing) return;
    setDrawing(false);
    onQualityChange(scoreCircleQuality(pointsRef.current));
  };

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-full border-2 border-[var(--color-gold)] bg-[#f8efd9] shadow-[inset_0_0_42px_rgba(89,65,28,0.14),0_18px_55px_rgba(33,26,18,0.16)]">
        <Image
          src={spell.designImage}
          alt={`${spell.name} tracing template`}
          fill
          priority
          sizes="(max-width: 768px) 90vw, 520px"
          className="pointer-events-none object-contain p-8 opacity-30"
        />
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          aria-label={`Trace the outer ring for ${spell.name}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishTrace}
          onPointerCancel={finishTrace}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
        />
        <div className="pointer-events-none absolute inset-[10%] rounded-full border border-dashed border-[rgba(74,63,134,0.2)]" />
      </div>
      <button
        type="button"
        onClick={clear}
        className="mx-auto mt-3 block rounded-lg border border-[var(--color-line)] bg-white/70 px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-[var(--color-gold)] hover:text-ink"
      >
        Clear trace
      </button>
    </div>
  );
}
