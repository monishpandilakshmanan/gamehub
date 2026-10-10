import { useEffect, useRef } from "react";

interface BinaryRainProps {
  className?: string;
  opacity?: number;
  /** stream speed multiplier */
  speed?: number;
  /** >1 denser streams, <1 sparser */
  density?: number;
}

interface Stream {
  y: number;
  v: number;
  dir: 1 | -1;
}

// Cap at 30fps — the rain reads identically and the CPU bill halves (no-lag rule).
const FRAME_MS = 1000 / 30;

/**
 * Dual-direction binary rain: some columns stream up-to-down, others
 * down-to-up, simultaneously, in green phosphor. Only mounted on admin routes.
 */
export default function BinaryRain({
  className = "",
  opacity = 1,
  speed = 1,
  density = 1,
}: BinaryRainProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const colWidth = Math.max(10, Math.round(18 / density));
    let streams: Stream[] = [];

    const paint = (w: number, h: number) => {
      ctx.fillStyle = "#020804";
      ctx.fillRect(0, 0, w, h);
    };

    const resize = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.ceil(w / colWidth);
      streams = Array.from({ length: count }, () => ({
        y: Math.random() * h,
        v: 45 + Math.random() * 100,
        dir: (Math.random() < 0.45 ? -1 : 1) as 1 | -1,
      }));
      paint(w, h);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let last = performance.now();
    let acc = 0;

    const loop = (t: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      acc += Math.min(100, t - last);
      last = t;
      if (acc < FRAME_MS) return;
      acc %= FRAME_MS;

      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      ctx.fillStyle = "rgba(2, 8, 4, 0.14)"; // phosphor trail fade
      ctx.fillRect(0, 0, w, h);
      ctx.font = '16px "Geist Mono Variable", monospace';

      for (let i = 0; i < streams.length; i++) {
        const s = streams[i];
        const x = i * colWidth + 2;
        ctx.shadowColor = "#00FF66";
        ctx.shadowBlur = 7;
        ctx.fillStyle = "#C8FFDD";
        ctx.fillText(Math.random() < 0.5 ? "0" : "1", x, s.y);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(0, 255, 102, 0.55)";
        ctx.fillText(Math.random() < 0.5 ? "1" : "0", x, s.y - s.dir * 16);

        s.y += s.dir * s.v * speed * (FRAME_MS / 1000);
        if (s.dir === 1 && s.y - 60 > h) {
          s.y = -30;
          s.v = 45 + Math.random() * 100;
        } else if (s.dir === -1 && s.y + 60 < 0) {
          s.y = h + 30;
          s.v = 45 + Math.random() * 100;
        }
      }
    };

    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [speed, density]);

  return <canvas ref={canvasRef} className={className} style={{ opacity }} aria-hidden="true" />;
}
