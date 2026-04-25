"use client";

import { useEffect, useRef } from "react";

/**
 * AnimatedSphere
 *
 * A large ASCII sphere that:
 *  1. Self-spins on a 45°-tilted axis (fast, clockwise)
 *  2. Revolves (orbits) around the entire hero content area (slow, counter-clockwise)
 *     — covering the full viewport from the label at the top to the stats row at the bottom
 *
 * Canvas is `position: fixed` — behind all page content at z-index 0.
 */
export function AnimatedSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Depth-mapped character palette: sparse back → dense front
    const CHARS = [
      "·", "·", ":", ":", "░", "░", "▒", "▒", "▓",
      "╭", "╮", "╰", "╯", "│", "─", "┤", "├",
      "▀", "▄", "▌", "▐", "▓", "█",
    ];

    let time = 0;

    /* ── Resize: keep canvas full-viewport at device pixel ratio ── */
    const resize = () => {
      const dpr     = window.devicePixelRatio || 1;
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    /* ── Rotation helpers ── */
    type P = [number, number, number];
    const rx = ([x, y, z]: P, a: number): P => [
      x,
      y * Math.cos(a) - z * Math.sin(a),
      y * Math.sin(a) + z * Math.cos(a),
    ];
    const ry = ([x, y, z]: P, a: number): P => [
      x * Math.cos(a) + z * Math.sin(a),
      y,
      -x * Math.sin(a) + z * Math.cos(a),
    ];
    const rz = ([x, y, z]: P, a: number): P => [
      x * Math.cos(a) - y * Math.sin(a),
      x * Math.sin(a) + y * Math.cos(a),
      z,
    ];

    /* ── Render loop ── */
    const render = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      /* 1 ── SPHERE RADIUS
              Large enough to be visually dominant but not overpowering.
              ~40% of the longer viewport dimension gives the reference-image look. */
      const radius = Math.max(W, H) * 0.38;

      /* 2 ── REVOLUTION ORBIT (opposite axis to self-spin)
              The sphere centre traces an ellipse that covers the ENTIRE
              hero section — from the top label to the bottom stats row.
              Orbit sweeps from ~radius away from each edge so the sphere
              is always partially visible (never fully off-screen).

              Counter-clockwise (negative angle) = opposite direction to
              the clockwise self-spin below.                                  */
      const REV_SPEED = 0.006;                   // rad/tick → full lap ≈ 17 s
      const revAngle  = -time * REV_SPEED;        // negative = counter-clockwise

      // Orbit is centred in the hero section viewport
      const orbitCX = W * 0.50;
      const orbitCY = H * 0.48;

      // Orbit radii: large enough that the sphere sweeps the whole viewport
      const orbitRX = W * 0.42;
      const orbitRY = H * 0.38;

      const cx = orbitCX + Math.cos(revAngle) * orbitRX;
      const cy = orbitCY + Math.sin(revAngle) * orbitRY;

      /* 3 ── SELF-ROTATION on 45°-TILTED AXIS
              Step A: spin around Z  (clockwise, fast)
              Step B: tilt the spin axis 45° via X rotation
              Step C: very slow precession around Y                          */
      const spin = time * 0.50;
      const tilt = Math.PI / 4;          // 45° — matches reference image
      const prec = time * 0.04;

      /* 4 ── SURFACE POINTS
              Step of 0.115 → ~1 500 points → solid sphere silhouette       */
      type Dot = { sx: number; sy: number; depth: number; char: string };
      const dots: Dot[] = [];

      const STEP = 0.115;
      for (let phi = 0; phi < Math.PI * 2; phi += STEP) {
        for (let theta = STEP * 0.5; theta < Math.PI; theta += STEP) {
          let p: P = [
            Math.sin(theta) * Math.cos(phi),
            Math.sin(theta) * Math.sin(phi),
            Math.cos(theta),
          ];

          p = rz(p, spin);    // A: self-spin (clockwise around Z)
          p = rx(p, tilt);    // B: tilt axis 45°
          p = ry(p, prec);    // C: slow precession

          const [px, py, pz] = p;
          const depth = (pz + 1) / 2;                             // 0 = back → 1 = front
          const ci    = Math.round(depth * (CHARS.length - 1));

          dots.push({
            sx:   cx + px * radius,
            sy:   cy + py * radius,
            depth,
            char: CHARS[ci],
          });
        }
      }

      // Painter's sort: back → front
      dots.sort((a, b) => a.depth - b.depth);

      /* 5 ── DRAW */
      ctx.font         = "12px 'JetBrains Mono', 'Courier New', monospace";
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";

      for (const { sx, sy, depth, char } of dots) {
        // Back face very faint; front face visible — same teal as brand
        const alpha = 0.06 + depth * 0.52;
        ctx.fillStyle = `rgba(0, 95, 140, ${alpha})`;
        ctx.fillText(char, sx, sy);
      }

      time += 0.016;
      frameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:      "fixed",
        inset:         0,
        width:         "100vw",
        height:        "100vh",
        zIndex:        0,
        pointerEvents: "none",
        display:       "block",
      }}
    />
  );
}
