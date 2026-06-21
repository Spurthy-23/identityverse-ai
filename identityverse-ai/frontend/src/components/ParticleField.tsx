import { useEffect, useRef } from "react";

/**
 * Lightweight canvas particle network -- the "cyber command center" ambient
 * layer. Deliberately simple (no physics library): ~50 points drifting at
 * fixed velocity, connected by faint lines when within range. Runs behind
 * everything at z-index 0, low particle count keeps it cheap enough to
 * leave running for the whole session.
 */
export function ParticleField({ density = 55 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const points = Array.from({ length: density }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
    }));

    const LINK_DIST = 130;
    let frame: number;

    function resize() {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }

    function tick() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (const p of points) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i], b = points[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DIST) {
            ctx.strokeStyle = `rgba(45, 226, 200, ${0.12 * (1 - dist / LINK_DIST)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of points) {
        ctx.fillStyle = "rgba(155, 123, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        frame = requestAnimationFrame(tick);
      }
    }

    window.addEventListener("resize", resize);
    tick();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none opacity-60"
      aria-hidden="true"
    />
  );
}

/** Combines the aurora gradient mesh + particle network + scan grid into
 * one backdrop, mounted once at the app root. */
export function CommandCenterBackdrop() {
  return (
    <>
      <div className="aurora-mesh" />
      <div className="fixed inset-0 z-0 grid-overlay pointer-events-none opacity-40" />
      <ParticleField />
    </>
  );
}
