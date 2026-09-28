import type { Application } from "pixi.js";
import type { World } from "../tipos";
import {
  MIN_ZOOM, MAX_ZOOM, CAM_PAN_SPEED, CAM_WHEEL_ZOOM_BASE, CAM_KEY_ZOOM_STEP, CAM_FOCUS_LERP,
} from "../juego/configuracion/predeterminados";
import {
  cssToRendererXY, screenToWorld, getCamera, cameraCenter, centerCameraOn, clampCameraToNatal,
} from "../utilidades/camera";
import { findNatalHex } from "../utilidades/busqueda";

export type CameraInputOpts = {
  /** Coords del renderer -> punto de mundo si caen dentro del minimapa (null si no). */
  minimapToWorld?: (rx: number, ry: number) => { x: number; y: number } | null;
};

const PAN_CODES: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp:    [0, -1],
  KeyS: [0,  1], ArrowDown:  [0,  1],
  KeyA: [-1, 0], ArrowLeft:  [-1, 0],
  KeyD: [ 1, 0], ArrowRight: [ 1, 0],
};

/**
 * Navegación de cámara:
 *  - WASD / flechas: mover (Shift ×2, Alt ×0.5)
 *  - Arrastrar con clic izq./central: mover
 *  - Rueda (con o sin Ctrl) o +/-: zoom
 *  - H / Inicio: volver al natal
 *  - Clic/arrastre en el minimapa: saltar a ese punto
 */
export class CameraInput {
  private app: Application;
  private w: World;
  private opts: CameraInputOpts;
  private keys = new Set<string>();
  private fast = false;
  private slow = false;

  private drag: { mode: "pan" | "minimap"; id: number; x: number; y: number } | null = null;
  private flyTo: { x: number; y: number; scale: number } | null = null;
  private lastW: number;
  private lastH: number;

  private unbind: Array<() => void> = [];

  constructor(app: Application, world: World, opts: CameraInputOpts = {}){
    this.app = app;
    this.w = world;
    this.opts = opts;

    // init camera con defaults
    const cam = getCamera(this.w);
    cam.scale = cam.scale ?? 1;
    cam.min = cam.min ?? MIN_ZOOM;
    cam.max = cam.max ?? MAX_ZOOM;

    const view = this.app.canvas;
    view.tabIndex = 0; try { view.focus(); } catch {}

    this.lastW = this.app.renderer.width;
    this.lastH = this.app.renderer.height;

    this.listen(view, "wheel", this.onWheel, { passive: false });
    this.listen(view, "contextmenu", this.onContext, { passive: false });
    this.listen(view, "pointerdown", this.onPointerDown);
    this.listen(view, "pointermove", this.onPointerMove);
    this.listen(view, "pointerup", this.onPointerUp);
    this.listen(view, "pointercancel", this.onPointerUp);
    this.listen(window, "keydown", this.onKeyDown);
    this.listen(window, "keyup", this.onKeyUp);
    this.listen(window, "blur", this.releaseAll);

    // Al cambiar el tamaño del canvas, conserva el punto de mundo del centro
    this.app.renderer.on("resize", this.onResize);
    this.unbind.push(() => this.app.renderer.off("resize", this.onResize));

    this.app.ticker.add(this.onTick);
    this.unbind.push(() => this.app.ticker.remove(this.onTick));
  }

  /** Vuelo suave (o salto) al natal con zoom 1. */
  focusNatal(animate = true){
    const q = findNatalHex(this.w);
    if (!q) return;
    if (animate) {
      this.flyTo = { x: q.cx, y: q.cy, scale: 1 };
    } else {
      this.flyTo = null;
      getCamera(this.w).scale = 1;
      centerCameraOn(this.app, this.w, q.cx, q.cy);
    }
  }

  destroy(){
    for (const off of this.unbind) off();
    this.unbind = [];
    this.keys.clear();
    this.drag = null;
  }

  // ===== helpers =====
  private listen(target: EventTarget, type: string, fn: (ev: any) => void, opts?: AddEventListenerOptions){
    target.addEventListener(type, fn, opts);
    this.unbind.push(() => target.removeEventListener(type, fn, opts));
  }

  /** Zoom manteniendo fijo el punto de mundo bajo (rx,ry) del renderer. */
  private zoomAt(rx: number, ry: number, factor: number){
    const cam = getCamera(this.w);
    const oldS = cam.scale || 1;
    const newS = Math.max(cam.min ?? MIN_ZOOM, Math.min(cam.max ?? MAX_ZOOM, oldS * factor));
    if (newS === oldS) return;
    const wx = cam.x + rx / oldS;
    const wy = cam.y + ry / oldS;
    cam.scale = newS;
    cam.x = wx - rx / newS;
    cam.y = wy - ry / newS;
    clampCameraToNatal(this.app, this.w);
  }

  private panScreen(dx: number, dy: number){
    const cam = getCamera(this.w);
    const s = cam.scale || 1;
    cam.x += dx / s;
    cam.y += dy / s;
    clampCameraToNatal(this.app, this.w);
  }

  private jumpToMinimap(rx: number, ry: number): boolean {
    const p = this.opts.minimapToWorld?.(rx, ry);
    if (!p) return false;
    this.flyTo = null;
    centerCameraOn(this.app, this.w, p.x, p.y);
    clampCameraToNatal(this.app, this.w);
    return true;
  }

  // ===== eventos =====
  private onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    this.flyTo = null;
    // normaliza líneas/páginas (Firefox) a px
    const dy = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaMode === 2 ? ev.deltaY * 100 : ev.deltaY;
    const { x, y } = cssToRendererXY(this.app, ev.clientX, ev.clientY);
    this.zoomAt(x, y, Math.pow(CAM_WHEEL_ZOOM_BASE, -dy));
  };

  // Clic derecho: publicar coord. de mundo
  private onContext = (ev: MouseEvent) => {
    ev.preventDefault();
    const p = screenToWorld(this.app, this.w, ev.clientX, ev.clientY);
    window.dispatchEvent(new CustomEvent("hexant:world-context", { detail: p }));
  };

  private onPointerDown = (ev: PointerEvent) => {
    if (ev.button !== 0 && ev.button !== 1) return; // el derecho es para comida/peligro
    if (ev.button === 1) ev.preventDefault();         // sin autoscroll
    const view = this.app.canvas;
    try { view.focus(); } catch {}
    const { x, y } = cssToRendererXY(this.app, ev.clientX, ev.clientY);
    const mode = this.jumpToMinimap(x, y) ? "minimap" : "pan";
    if (mode === "pan") { this.flyTo = null; view.style.cursor = "grabbing"; }
    this.drag = { mode, id: ev.pointerId, x, y };
    try { view.setPointerCapture(ev.pointerId); } catch {}
  };

  private onPointerMove = (ev: PointerEvent) => {
    if (!this.drag || ev.pointerId !== this.drag.id) return;
    const { x, y } = cssToRendererXY(this.app, ev.clientX, ev.clientY);
    if (this.drag.mode === "minimap") {
      this.jumpToMinimap(x, y);
    } else {
      this.panScreen(this.drag.x - x, this.drag.y - y);
    }
    this.drag.x = x; this.drag.y = y;
  };

  private onPointerUp = (ev: PointerEvent) => {
    if (!this.drag || ev.pointerId !== this.drag.id) return;
    this.drag = null;
    this.app.canvas.style.cursor = "";
    try { this.app.canvas.releasePointerCapture(ev.pointerId); } catch {}
  };

  private onKeyDown = (ev: KeyboardEvent) => {
    if (ev.ctrlKey || ev.metaKey || isEditable(ev.target)) return; // no robar atajos del navegador
    this.fast = ev.shiftKey; this.slow = ev.altKey;

    if (PAN_CODES[ev.code]) {
      this.keys.add(ev.code);
      this.flyTo = null;
      ev.preventDefault(); // flechas: sin scroll de página
      return;
    }

    const W = this.app.renderer.width, H = this.app.renderer.height;
    switch (ev.key) {
      case "+": case "=":
        this.flyTo = null; this.zoomAt(W / 2, H / 2, CAM_KEY_ZOOM_STEP); ev.preventDefault(); break;
      case "-": case "_":
        this.flyTo = null; this.zoomAt(W / 2, H / 2, 1 / CAM_KEY_ZOOM_STEP); ev.preventDefault(); break;
      case "h": case "H": case "Home":
        this.focusNatal(true); ev.preventDefault(); break;
    }
  };

  private onKeyUp = (ev: KeyboardEvent) => {
    this.keys.delete(ev.code);
    this.fast = ev.shiftKey; this.slow = ev.altKey;
  };

  /** Al perder el foco no llegan los keyup: suelta todo para que la cámara no quede "pegada". */
  private releaseAll = () => {
    this.keys.clear();
    this.fast = this.slow = false;
    this.drag = null;
    this.app.canvas.style.cursor = "";
  };

  private onResize = (width: number, height: number) => {
    const cam = getCamera(this.w);
    const s = cam.scale || 1;
    cam.x += (this.lastW - width)  / (2 * s);
    cam.y += (this.lastH - height) / (2 * s);
    this.lastW = width;
    this.lastH = height;
  };

  private onTick = () => {
    const dtSec = Math.min(0.1, (this.app.ticker.deltaMS ?? 16.6) / 1000);

    // Pan con teclado (velocidad en px de pantalla, independiente del zoom y de los fps)
    let dx = 0, dy = 0;
    for (const code of this.keys) {
      const d = PAN_CODES[code];
      if (d) { dx += d[0]; dy += d[1]; }
    }
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      const speed = CAM_PAN_SPEED * 60 * (this.fast ? 2 : 1) * (this.slow ? 0.5 : 1);
      this.panScreen((dx / len) * speed * dtSec, (dy / len) * speed * dtSec);
    }

    // Vuelo al natal
    if (this.flyTo) {
      const cam = getCamera(this.w);
      const k = 1 - Math.exp(-CAM_FOCUS_LERP * dtSec);
      const c = cameraCenter(this.app, this.w);
      cam.scale += (this.flyTo.scale - cam.scale) * k;
      const nx = c.x + (this.flyTo.x - c.x) * k;
      const ny = c.y + (this.flyTo.y - c.y) * k;
      const done = Math.hypot(this.flyTo.x - nx, this.flyTo.y - ny) < 0.5
                && Math.abs(this.flyTo.scale - cam.scale) < 0.002;
      if (done) {
        cam.scale = this.flyTo.scale;
        centerCameraOn(this.app, this.w, this.flyTo.x, this.flyTo.y);
        this.flyTo = null;
      } else {
        centerCameraOn(this.app, this.w, nx, ny);
      }
    }
  };
}

function isEditable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}
