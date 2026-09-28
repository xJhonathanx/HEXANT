import type { Application } from "pixi.js";
import type { World, Camera } from "../tipos";
import { NAV_RADIUS_MIN, NAV_RADIUS_DOME_MULT } from "../juego/configuracion/predeterminados";
import { findNatalHex } from "./busqueda";

/**
 * Usa el EventSystem de Pixi si existe (v7): mapea clientX/Y -> coords internas del renderer.
 * Si no, fallback a cálculo con getBoundingClientRect + tamaño real del buffer.
 */
export function cssToRendererXY(app: Application, clientX: number, clientY: number){
  const evs: any = (app.renderer as any).events;
  if (evs && typeof evs.mapPositionToPoint === "function") {
    const pt = { x: 0, y: 0 };
    // mapPositionToPoint(PointLike, clientX, clientY) -> coords del buffer interno (DPR-correctas)
    evs.mapPositionToPoint(pt as any, clientX, clientY);
    return pt;
  }

  // Fallback: medir rectángulo visual y escalar al buffer real del canvas
  const view = app.canvas;
  const rect = view.getBoundingClientRect();
  const cssX = clientX - rect.left;
  const cssY = clientY - rect.top;

  // MUY IMPORTANTE: usar el tamaño del buffer (view.width/height), no el CSS
  const bufferW = view.width;  // ya incluye DPR
  const bufferH = view.height;

  const scaleX = bufferW / rect.width;
  const scaleY = bufferH / rect.height;

  return { x: cssX * scaleX, y: cssY * scaleY };
}

/** Pantalla -> Mundo usando la cámara (pan/zoom). */
export function screenToWorld(app: Application, w: { camera?: any }, clientX: number, clientY: number){
  const { x: rx, y: ry } = cssToRendererXY(app, clientX, clientY);
  const cam = (w.camera ?? { x: 0, y: 0, scale: 1 }) as any;
  const s = cam.scale ?? 1;
  return { x: (cam.x ?? 0) + rx / s, y: (cam.y ?? 0) + ry / s };
}

/** MouseEvent -> Mundo (azúcar). */
export function eventToWorld(app: Application, w: { camera?: any }, ev: MouseEvent){
  return screenToWorld(app, w, ev.clientX, ev.clientY);
}

/**
 * MUY RECOMENDADO: hacer que el renderer siga el tamaño CSS del canvas.
 * Evita desfaces si el canvas cambia de tamaño por CSS.
 */
export function ensureRendererMatchesCSS(app: Application){
  const view = app.canvas;
  const resize = () => {
    const rect = view.getBoundingClientRect();
    // Pixi espera dimensiones en px CSS; resolution se aplica por dentro
    app.renderer.resize(
      Math.max(1, Math.round(rect.width)),
      Math.max(1, Math.round(rect.height))
    );
  };
  resize();
  window.addEventListener("resize", resize);
  return () => window.removeEventListener("resize", resize);
}

/** Card / borde neón del canvas (inyecta estilos solo una vez). Llamar ANTES de medir el canvas. */
export function ensureNeonCard(view: HTMLCanvasElement){
  view.classList.add("pixi-card");
  if (!document.getElementById("neon-card-style")){
    const css = `
      html,body,#root{height:100%}
      body{margin:0;background:#0a0d11}
      canvas.pixi-card{
        display:block; width:92vw; height:92vh; margin:4vh auto;
        border-radius:16px; background:#0a0d11;
        box-shadow: 0 0 0 2px rgba(0,255,255,.08),
                    0 0 18px rgba(0,200,255,.12),
                    inset 0 0 12px rgba(0,255,255,.06);
        touch-action:none;
      }`;
    const style = document.createElement("style");
    style.id = "neon-card-style";
    style.textContent = css;
    document.head.appendChild(style);
  }
}

/* ===================== Cámara ↔ natal ===================== */

/** Cámara del mundo (la crea si falta). x,y = esquina sup-izq del viewport en coords de mundo. */
export function getCamera(w: World): Camera {
  w.camera = w.camera ?? { x: 0, y: 0, scale: 1 };
  return w.camera;
}

/** Punto de mundo que está en el centro del viewport. */
export function cameraCenter(app: Application, w: World){
  const cam = getCamera(w);
  const s = cam.scale || 1;
  return {
    x: cam.x + app.renderer.width  / (2 * s),
    y: cam.y + app.renderer.height / (2 * s),
  };
}

/** Mueve la cámara para que (x,y) quede en el centro del viewport (sin tocar el zoom). */
export function centerCameraOn(app: Application, w: World, x: number, y: number){
  const cam = getCamera(w);
  const s = cam.scale || 1;
  cam.x = x - app.renderer.width  / (2 * s);
  cam.y = y - app.renderer.height / (2 * s);
}

/** Radio del AIR (domo) alrededor del natal. */
export function natalDomeRadius(w: World): number {
  const q = findNatalHex(w);
  return (w.meta?.domeRadius ?? w.domeRadius ?? (q ? q.sidePx * 6 : 0)) as number;
}

/** Radio de la zona navegable: el centro de la cámara no puede alejarse más que esto del natal. */
export function natalNavRadius(w: World): number {
  return Math.max(NAV_RADIUS_MIN, natalDomeRadius(w) * NAV_RADIUS_DOME_MULT);
}

/** Mantiene el centro de la cámara dentro de la zona navegable del natal. */
export function clampCameraToNatal(app: Application, w: World){
  const q = findNatalHex(w);
  if (!q) return;
  const c = cameraCenter(app, w);
  const dx = c.x - q.cx, dy = c.y - q.cy;
  const d = Math.hypot(dx, dy);
  const R = natalNavRadius(w);
  if (d <= R) return;
  centerCameraOn(app, w, q.cx + (dx / d) * R, q.cy + (dy / d) * R);
}
