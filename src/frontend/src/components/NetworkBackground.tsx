import { useEffect, useRef } from "react";

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  pulseOffset: number;
}

interface OrbitalRing {
  radiusXFactor: number;
  radiusYFactor: number;
  rotation: number;
  speed: number;
  opacity: number;
  lineWidth: number;
  dash: number[];
}

interface CanvasState {
  nodes: NetworkNode[];
  rings: OrbitalRing[];
  w: number;
  h: number;
  cx: number;
  cy: number;
  tick: number;
}

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const stateRef = useRef<CanvasState>({
    nodes: [],
    rings: [],
    w: 0,
    h: 0,
    cx: 0,
    cy: 0,
    tick: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const state = stateRef.current;

    // ── Full initialisation (first time only) ────────────────────────────
    function init(w: number, h: number) {
      state.w = w;
      state.h = h;
      state.cx = w * 0.57;
      state.cy = h * 0.42;
      state.tick = 0;

      // More nodes, higher base opacity for better visibility
      state.nodes = Array.from({ length: 90 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.8 + 0.6,
        opacity: Math.random() * 0.55 + 0.3,
        pulseOffset: Math.random() * Math.PI * 2,
      }));

      // Rings stored as factors so they scale with canvas
      state.rings = [
        {
          radiusXFactor: 0.28,
          radiusYFactor: 0.075,
          rotation: 0.15,
          speed: 0.00025,
          opacity: 0.25,
          lineWidth: 1.1,
          dash: [],
        },
        {
          radiusXFactor: 0.35,
          radiusYFactor: 0.096,
          rotation: -0.28,
          speed: -0.0002,
          opacity: 0.18,
          lineWidth: 0.85,
          dash: [],
        },
        {
          radiusXFactor: 0.2,
          radiusYFactor: 0.056,
          rotation: 0.52,
          speed: 0.00032,
          opacity: 0.22,
          lineWidth: 1.0,
          dash: [],
        },
        {
          radiusXFactor: 0.42,
          radiusYFactor: 0.062,
          rotation: -0.08,
          speed: 0.00017,
          opacity: 0.12,
          lineWidth: 0.65,
          dash: [5, 9],
        },
        {
          radiusXFactor: 0.48,
          radiusYFactor: 0.11,
          rotation: 0.35,
          speed: -0.00014,
          opacity: 0.09,
          lineWidth: 0.5,
          dash: [3, 12],
        },
      ];
    }

    // ── Resize: scale existing node positions, do NOT reinitialise ────────
    function resize(newW: number, newH: number) {
      const oldW = state.w;
      const oldH = state.h;

      if (oldW > 0 && oldH > 0) {
        const scaleX = newW / oldW;
        const scaleY = newH / oldH;
        for (const node of state.nodes) {
          node.x *= scaleX;
          node.y *= scaleY;
        }
      }

      state.w = newW;
      state.h = newH;
      state.cx = newW * 0.57;
      state.cy = newH * 0.42;
    }

    // ── Apply canvas pixel dimensions and DPR scale ──────────────────────
    function applyCanvasSize(w: number, h: number) {
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.scale(dpr, dpr);
    }

    function draw() {
      if (!ctx) return;
      const { w, h, cx, cy, nodes, rings, tick } = state;
      if (w === 0 || h === 0) return;

      const baseR = Math.min(w, h);
      const sphereR = baseR * 0.145;

      // ── Background ──────────────────────────────────────────────────────
      ctx.fillStyle = "#00000c";
      ctx.fillRect(0, 0, w, h);

      // ── Connection lines ────────────────────────────────────────────────
      const THRESHOLD = 150;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < THRESHOLD * THRESHOLD) {
            const dist = Math.sqrt(distSq);
            const baseAlpha = (1 - dist / THRESHOLD) * 0.28;
            ctx.beginPath();
            ctx.lineWidth = 0.7;
            ctx.strokeStyle = `rgba(110,160,255,${baseAlpha.toFixed(3)})`;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // ── Nodes with gentle pulse ──────────────────────────────────────────
      for (const node of nodes) {
        const pulse = 0.85 + 0.15 * Math.sin(tick * 0.018 + node.pulseOffset);
        const op = node.opacity * pulse;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160,195,255,${op.toFixed(3)})`;
        ctx.fill();

        // Soft glow around larger nodes
        if (node.radius > 1.6) {
          const grd = ctx.createRadialGradient(
            node.x,
            node.y,
            0,
            node.x,
            node.y,
            node.radius * 4,
          );
          grd.addColorStop(0, `rgba(120,170,255,${(op * 0.35).toFixed(3)})`);
          grd.addColorStop(1, "rgba(120,170,255,0)");
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 4, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }
      }

      // ── Orbital rings ────────────────────────────────────────────────────
      for (const ring of rings) {
        const rx = baseR * ring.radiusXFactor;
        const ry = baseR * ring.radiusYFactor;
        ctx.save();
        ctx.translate(cx, cy);
        if (ring.dash.length > 0) ctx.setLineDash(ring.dash);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, ring.rotation, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180,210,255,${ring.opacity})`;
        ctx.lineWidth = ring.lineWidth;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        ring.rotation += ring.speed;
      }

      // ── Cosmic outer glow ────────────────────────────────────────────────
      const cosmicGlow = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        sphereR * 7,
      );
      cosmicGlow.addColorStop(0, "rgba(55,90,220,0.28)");
      cosmicGlow.addColorStop(0.3, "rgba(30,65,175,0.13)");
      cosmicGlow.addColorStop(0.65, "rgba(10,25,90,0.05)");
      cosmicGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, sphereR * 7, 0, Math.PI * 2);
      ctx.fillStyle = cosmicGlow;
      ctx.fill();

      // ── Atmospheric mid-glow ─────────────────────────────────────────────
      const atmGlow = ctx.createRadialGradient(
        cx,
        cy,
        sphereR * 0.85,
        cx,
        cy,
        sphereR * 3.2,
      );
      atmGlow.addColorStop(0, "rgba(85,140,255,0.26)");
      atmGlow.addColorStop(0.5, "rgba(55,100,235,0.12)");
      atmGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, sphereR * 3.2, 0, Math.PI * 2);
      ctx.fillStyle = atmGlow;
      ctx.fill();

      // ── Core sphere body ─────────────────────────────────────────────────
      const hlX = cx - sphereR * 0.28;
      const hlY = cy - sphereR * 0.22;
      const coreGrad = ctx.createRadialGradient(hlX, hlY, 0, cx, cy, sphereR);
      coreGrad.addColorStop(0, "rgba(235,245,255,0.97)");
      coreGrad.addColorStop(0.2, "rgba(195,220,255,0.9)");
      coreGrad.addColorStop(0.5, "rgba(125,180,255,0.74)");
      coreGrad.addColorStop(0.8, "rgba(65,110,235,0.48)");
      coreGrad.addColorStop(1, "rgba(20,55,175,0.12)");
      ctx.beginPath();
      ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // ── Specular highlight ───────────────────────────────────────────────
      const specGrad = ctx.createRadialGradient(
        hlX,
        hlY,
        0,
        hlX,
        hlY,
        sphereR * 0.55,
      );
      specGrad.addColorStop(0, "rgba(255,255,255,0.82)");
      specGrad.addColorStop(0.45, "rgba(220,235,255,0.14)");
      specGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = specGrad;
      ctx.fillRect(cx - sphereR, cy - sphereR, sphereR * 2, sphereR * 2);
      ctx.restore();
    }

    function update() {
      const { nodes, w, h } = state;
      state.tick++;
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x <= 0 || node.x >= w) {
          node.vx = -node.vx;
          node.x = Math.max(0, Math.min(w, node.x));
        }
        if (node.y <= 0 || node.y >= h) {
          node.vy = -node.vy;
          node.y = Math.max(0, Math.min(h, node.y));
        }
      }
    }

    function loop() {
      update();
      draw();
      animationFrameRef.current = requestAnimationFrame(loop);
    }

    // ── Initialise ──────────────────────────────────────────────────────────
    const rect = canvas.getBoundingClientRect();
    const initW = rect.width || canvas.offsetWidth || 800;
    const initH = rect.height || canvas.offsetHeight || 400;
    applyCanvasSize(initW, initH);
    init(initW, initH);
    animationFrameRef.current = requestAnimationFrame(loop);

    // ── Resize: scale nodes, redraw — no reinit ──────────────────────────
    function handleResize() {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const newW = r.width;
      const newH = r.height;
      if (newW === 0 || newH === 0) return;

      resize(newW, newH);
      // Resetting canvas dimensions resets the ctx transform — reapply scale
      canvas.width = Math.round(newW * dpr);
      canvas.height = Math.round(newH * dpr);
      ctx!.scale(dpr, dpr);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
