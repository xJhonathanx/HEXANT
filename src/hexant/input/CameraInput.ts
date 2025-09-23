import type { Application } from "pixi.js";
import type { World } from "../tipos";
import { MIN_ZOOM, MAX_ZOOM, CAM_PAN_SPEED } from "../juego/configuracion/predeterminados";
import { cssToRendererXY, screenToWorld, ensureRendererMatchesCSS } from "../utilidades/camera";

export class CameraInput {
  private app: Application;
  private w: World;
  private keys = new Set<string>();

  constructor(app: Application, world: World){
    this.app = app;
    this.w = world;

    // init camera con defaults
    const cam: any = (this.w as any).camera ?? {};
    (this.w as any).camera = {
      x: cam.x ?? 0,
      y: cam.y ?? 0,
      scale: cam.scale ?? 1,
      min: cam.min ?? MIN_ZOOM,
      max: cam.max ?? MAX_ZOOM
    };

    // Card / borde neón + asegurar que el buffer sigue el tamaño CSS
    this.ensureNeonCard(this.app.view as HTMLCanvasElement);
    ensureRendererMatchesCSS(this.app);

    const view = this.app.view as HTMLCanvasElement;
    view.tabIndex = 0; try { view.focus(); } catch {}

    // === Zoom Ctrl + rueda (anclado al cursor) ===
    view.addEventListener("wheel", (ev: WheelEvent) => {
      if (!ev.ctrlKey) return;
      ev.preventDefault();

      const cam:any = (this.w as any).camera;
      const oldS = cam.scale ?? 1;
      const sMin = cam.min ?? MIN_ZOOM;
      const sMax = cam.max ?? MAX_ZOOM;

      const { x: mx, y: my } = cssToRendererXY(this.app, ev.clientX, ev.clientY);
      const wx = (cam.x ?? 0) + mx / oldS;
      const wy = (cam.y ?? 0) + my / oldS;

      const factor = Math.pow(1.0015, -ev.deltaY);
      const newS = Math.max(sMin, Math.min(sMax, oldS * factor));
      if (newS === oldS) return;

      cam.scale = newS;
      cam.x = wx - mx / newS;
      cam.y = wy - my / newS;
    }, { passive: false });

    // === Clic derecho: publicar coord. de mundo ===
    view.addEventListener("contextmenu", (ev: MouseEvent) => {
      ev.preventDefault();
      const p = screenToWorld(this.app, this.w, ev.clientX, ev.clientY);
      window.dispatchEvent(new CustomEvent("hexant:world-context", { detail: p }));
    }, { passive: false });

    // === Pan con teclado (WASD) ===
    window.addEventListener("keydown", (e)=> this.keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup",   (e)=> this.keys.delete(e.key.toLowerCase()));

    this.app.ticker.add(() => {
      const cam:any = (this.w as any).camera;
      const base = CAM_PAN_SPEED;
      const mul =
        (this.keys.has("shift") ? 2 : 1) *
        (this.keys.has("alt") ? 0.5 : 1);

      let dx = 0, dy = 0;
      if (this.keys.has("a")) dx -= 1;
      if (this.keys.has("d")) dx += 1;
      if (this.keys.has("w")) dy -= 1;
      if (this.keys.has("s")) dy += 1;

      if (dx || dy){
        cam.x += dx * base * mul;
        cam.y += dy * base * mul;
      }
    });
  }

  private ensureNeonCard(view: HTMLCanvasElement){
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
        }`;
      const style = document.createElement("style");
      style.id = "neon-card-style";
      style.textContent = css;
      document.head.appendChild(style);
    }
  }
}
