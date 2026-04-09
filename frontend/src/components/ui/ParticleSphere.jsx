import { useEffect, useRef, useState, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const NUM_DOTS = 700;
const SPHERE_RADIUS = 175;
const REPEL_RADIUS = 90;
const REPEL_STRENGTH = 0.38;
const SPRING = 0.12;
const DAMPING = 0.72;
const AUTO_SPEED = 0.004;

// ─── Utility: generate Fibonacci sphere base points ───────────────────────────
function generateFibonacciSphere(num) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < num; i++) {
    const y = 1 - (i / (num - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return pts;
}

// ─── Utility: rotate point by rotX, rotY ─────────────────────────────────────
function rotatePoint(p, rotX, rotY) {
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const y2 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;
  return { x: x1, y: y2, z: z2 };
}

// ─── Utility: project 3D → 2D ─────────────────────────────────────────────────
function project(rx, ry, rz, W, H, R) {
  const scale = (rz + 2.2) / 3.2;
  return {
    sx: rx * R * scale + W / 2,
    sy: ry * R * scale + H / 2,
    z: rz,
    scale,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component 1: useSpherePhysics  (custom hook — all physics logic lives here)
// ─────────────────────────────────────────────────────────────────────────────
function useSpherePhysics(canvasRef, W, H) {
  const stateRef = useRef({
    base: generateFibonacciSphere(NUM_DOTS),
    disp: Array.from({ length: NUM_DOTS }, () => ({ x: 0, y: 0, z: 0 })),
    vel: Array.from({ length: NUM_DOTS }, () => ({ x: 0, y: 0, z: 0 })),
    rotX: 0.3,
    rotY: 0,
    autoVelX: 0,
    autoVelY: AUTO_SPEED,
    dragging: false,
    lastMX: 0,
    lastMY: 0,
    dragVX: 0,
    dragVY: 0,
    mouse: { x: -9999, y: -9999, inside: false },
    raf: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    // ── Event helpers ──
    const toCanvasCoords = (cx, cy) => {
      const b = canvas.getBoundingClientRect();
      return {
        x: (cx - b.left) * (W / b.width),
        y: (cy - b.top) * (H / b.height),
      };
    };

    const onMouseEnter = () => { s.mouse.inside = true; };
    const onMouseLeave = () => { s.mouse.inside = false; s.mouse.x = -9999; s.mouse.y = -9999; };
    const onMouseMove = (e) => {
      const c = toCanvasCoords(e.clientX, e.clientY);
      s.mouse.x = c.x; s.mouse.y = c.y;
      if (s.dragging) {
        const dx = e.clientX - s.lastMX;
        const dy = e.clientY - s.lastMY;
        s.dragVY = dx * 0.004;
        s.dragVX = dy * 0.004;
        s.rotY += s.dragVY;
        s.rotX += s.dragVX;
        s.lastMX = e.clientX; s.lastMY = e.clientY;
      }
    };
    const onMouseDown = (e) => {
      s.dragging = true;
      s.lastMX = e.clientX; s.lastMY = e.clientY;
      s.autoVelX = 0; s.autoVelY = 0;
      s.dragVX = 0; s.dragVY = 0;
    };
    const onMouseUp = () => {
      if (s.dragging) { s.autoVelY = s.dragVY; s.autoVelX = s.dragVX; }
      s.dragging = false;
    };
    const onTouchStart = (e) => {
      s.dragging = true;
      s.lastMX = e.touches[0].clientX; s.lastMY = e.touches[0].clientY;
      s.autoVelX = 0; s.autoVelY = 0;
    };
    const onTouchEnd = () => { s.dragging = false; };
    const onTouchMove = (e) => {
      if (!s.dragging) return;
      const c = toCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
      s.mouse.x = c.x; s.mouse.y = c.y;
      const dx = e.touches[0].clientX - s.lastMX;
      const dy = e.touches[0].clientY - s.lastMY;
      s.dragVY = dx * 0.004; s.dragVX = dy * 0.004;
      s.rotY += s.dragVY; s.rotX += s.dragVX;
      s.lastMX = e.touches[0].clientX; s.lastMY = e.touches[0].clientY;
    };

    canvas.addEventListener("mouseenter", onMouseEnter);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("mouseenter", onMouseEnter);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchend", onTouchEnd);
      if (s.raf) cancelAnimationFrame(s.raf);
    };
  }, [canvasRef, W, H]);

  return stateRef;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component 3: SphereCanvas  (the <canvas> element + animation loop)
// ─────────────────────────────────────────────────────────────────────────────
function SphereCanvas({ width = 460, height = 460, darkMode }) {
  const canvasRef = useRef(null);
  const stateRef = useSpherePhysics(canvasRef, width, height);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Build draw fn
    const getDraw = () => {
      const s = stateRef.current;

      if (!s.dragging) {
        s.autoVelY += (AUTO_SPEED - s.autoVelY) * 0.04;
        s.autoVelX += (0 - s.autoVelX) * 0.04;
        s.rotY += s.autoVelY;
        s.rotX += s.autoVelX;
      }

      ctx.clearRect(0, 0, width, height);
      const projected = [];

      for (let i = 0; i < NUM_DOTS; i++) {
        const rot = rotatePoint(s.base[i], s.rotX, s.rotY);
        const proj0 = project(rot.x, rot.y, rot.z, width, height, SPHERE_RADIUS);

        const mdx = proj0.sx - s.mouse.x;
        const mdy = proj0.sy - s.mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (s.mouse.inside && mdist < REPEL_RADIUS && mdist > 0.1) {
          const falloff = 1 - mdist / REPEL_RADIUS;
          const strength = falloff * falloff * REPEL_STRENGTH;
          s.vel[i].x += rot.x * strength * 0.7 + (mdx / mdist) * strength * 0.5;
          s.vel[i].y += rot.y * strength * 0.7 + (mdy / mdist) * strength * 0.5;
          s.vel[i].z += rot.z * strength * 0.7;
        }

        s.vel[i].x = (s.vel[i].x - s.disp[i].x * SPRING) * DAMPING;
        s.vel[i].y = (s.vel[i].y - s.disp[i].y * SPRING) * DAMPING;
        s.vel[i].z = (s.vel[i].z - s.disp[i].z * SPRING) * DAMPING;
        s.disp[i].x += s.vel[i].x;
        s.disp[i].y += s.vel[i].y;
        s.disp[i].z += s.vel[i].z;

        const p = project(
          rot.x + s.disp[i].x,
          rot.y + s.disp[i].y,
          rot.z + s.disp[i].z,
          width, height, SPHERE_RADIUS
        );
        projected.push({ sx: p.sx, sy: p.sy, z: p.z });
      }

      projected.sort((a, b) => a.z - b.z);

      for (const p of projected) {
        const depth = Math.max(0, Math.min(1, (p.z + 1) / 2));
        const size = 0.7 + depth * 2.4;
        const alpha = 0.07 + depth * 0.88;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fillStyle = darkMode
          ? `rgba(225,222,212,${alpha})`
          : `rgba(28,26,24,${alpha})`;
        ctx.fill();
      }

      if (s.mouse.inside) {
        ctx.beginPath();
        ctx.arc(s.mouse.x, s.mouse.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
        ctx.fill();
      }
    };

    const loop = () => {
      getDraw();
      stateRef.current.raf = requestAnimationFrame(loop);
    };
    stateRef.current.raf = requestAnimationFrame(loop);

    return () => {
      if (stateRef.current.raf) cancelAnimationFrame(stateRef.current.raf);
    };
  }, [width, height, darkMode, stateRef]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block", cursor: "none" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component 4: DarkModeToggle
// ─────────────────────────────────────────────────────────────────────────────
function DarkModeToggle({ darkMode, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: "absolute",
        top: "16px",
        right: "16px",
        background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        border: "1px solid " + (darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"),
        borderRadius: "20px",
        padding: "6px 14px",
        cursor: "pointer",
        fontSize: "12px",
        fontFamily: "inherit",
        color: darkMode ? "#e0ddd4" : "#1c1a18",
        letterSpacing: "0.04em",
        transition: "all 0.2s",
      }}
    >
      {darkMode ? "☀ Light" : "☾ Dark"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component 5: SphereLabel  (the text label beneath / above the sphere)
// ─────────────────────────────────────────────────────────────────────────────
function SphereLabel({ darkMode }) {
  const textColor = darkMode ? "#888480" : "#888480";
  return (
    <div
      style={{
        textAlign: "center",
        fontFamily: "'Georgia', serif",
        fontSize: "11px",
        letterSpacing: "0.12em",
        color: textColor,
        textTransform: "uppercase",
        marginTop: "-8px",
        userSelect: "none",
      }}
    >

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component 6: SphereControls  (sliders for tuning params live)
// ─────────────────────────────────────────────────────────────────────────────
function SphereControls({ params, onChange, darkMode }) {
  const labelStyle = {
    fontSize: "11px",
    fontFamily: "'Georgia', serif",
    letterSpacing: "0.06em",
    color: darkMode ? "#666260" : "#888480",
    textTransform: "uppercase",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
  };
  const sliderStyle = {
    width: "100%",
    accentColor: darkMode ? "#a09d94" : "#555250",
    cursor: "pointer",
  };
  const controls = [
    { key: "repelRadius", label: "Repel radius", min: 20, max: 200, step: 1 },
    { key: "repelStrength", label: "Repel strength", min: 0.05, max: 1, step: 0.01 },
    { key: "spring", label: "Spring", min: 0.01, max: 0.4, step: 0.01 },
    { key: "damping", label: "Damping", min: 0.3, max: 0.98, step: 0.01 },
  ];
  return (
    <div style={{ width: "220px", padding: "16px 0" }}>
      {controls.map(c => (
        <div key={c.key} style={{ marginBottom: "14px" }}>
          <div style={labelStyle}>
            <span>{c.label}</span>
            <span>{params[c.key]}</span>
          </div>
          <input
            type="range"
            min={c.min} max={c.max} step={c.step}
            value={params[c.key]}
            onChange={e => onChange(c.key, parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component 7: ParticleSphere  (top-level — composes everything)
// ─────────────────────────────────────────────────────────────────────────────
export default function ParticleSphere() {
  const [darkMode, setDarkMode] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [params, setParams] = useState({
    repelRadius: REPEL_RADIUS,
    repelStrength: REPEL_STRENGTH,
    spring: SPRING,
    damping: DAMPING,
  });

  const handleParam = useCallback((key, val) => {
    setParams(p => ({ ...p, [key]: val }));
  }, []);

  const bg = darkMode ? "#111110" : "#f0f0ee";
  const text = darkMode ? "#c8c5bc" : "#1c1a18";

  return (
    <div
      style={{
        position: "relative",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0px",
        transition: "background 0.4s",
        fontFamily: "'Georgia', serif",
      }}
    >
      <DarkModeToggle darkMode={darkMode} onToggle={() => setDarkMode(d => !d)} />

      {/* Title */}
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.2em",
          color: darkMode ? "#555250" : "#aaa9a4",
          textTransform: "uppercase",
          marginBottom: "28px",
          userSelect: "none",
        }}
      >

      </div>

      {/* Sphere */}
      <SphereCanvas width={460} height={460} darkMode={darkMode} params={params} />
      <SphereLabel darkMode={darkMode} />

      {/* Controls toggle */}
      <button
        onClick={() => setShowControls(s => !s)}
        style={{
          marginTop: "24px",
          background: "transparent",
          border: "1px solid " + (darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"),
          borderRadius: "20px",
          padding: "6px 18px",
          cursor: "pointer",
          fontSize: "11px",
          fontFamily: "inherit",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: darkMode ? "#888480" : "#888480",
          transition: "all 0.2s",
        }}
      >
        {showControls ? "Hide controls" : ""}
      </button>

      {showControls && (
        <SphereControls
          params={params}
          onChange={handleParam}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
