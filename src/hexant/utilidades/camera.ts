import type { Application } from "pixi.js";

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
  const view = app.view as HTMLCanvasElement;
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
  const view = app.view as HTMLCanvasElement;
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
