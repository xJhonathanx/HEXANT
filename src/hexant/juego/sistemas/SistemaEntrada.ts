/**
 * SistemaEntrada — helpers que invoca la UI (Aplicacion.tsx).
 * Click derecho: comida (10). Shift: patrón. Ctrl: peligro.
 */
import type { Application } from "pixi.js";
import type { World } from "../../tipos";
import { stampFoodPattern } from "../contenido/Patrones";
import { eventToWorld } from "../../utilidades/camera";

/** Coloca un nodo de comida en (x,y). */
export function placeFood(w: World, x: number, y: number, amount = 10){
  const node: any = { x, y, amount, initial: amount };
  node.outside = true;
  (w as any).food.push(node);
}

/** Estampa un patrón de comida (solo ejemplo). */
export function placePattern(w: World, x: number, y: number){
  stampFoodPattern(w, x, y, { kind:"random", cellSize:24, amountPerCell:10 });
}

/** Crea un hazard/peligro simple. */
export function placeHazard(w: World, x: number, y: number){
  (w as any).hazards.push({
    x, y, r: 12, hp: 100,
    vx: (Math.random()*0.6-0.3),
    vy: (Math.random()*0.6-0.3)
  });
}

/** Colocar COMIDA desde MouseEvent (usa clientX/Y y convierte a mundo). */
export function placeFoodFromScreen(app: Application, w: World, ev: MouseEvent, amount = 10){
  const p = eventToWorld(app, w as any, ev);
  return placeFood(w, p.x, p.y, amount);
}

/** Colocar PATRÓN desde MouseEvent. */
export function placePatternFromScreen(app: Application, w: World, ev: MouseEvent){
  const p = eventToWorld(app, w as any, ev);
  return placePattern(w, p.x, p.y);
}

/** Colocar PELIGRO desde MouseEvent. */
export function placeHazardFromScreen(app: Application, w: World, ev: MouseEvent){
  const p = eventToWorld(app, w as any, ev);
  return placeHazard(w, p.x, p.y);
}

/**
 * Enlaza el clic derecho del canvas para colocar comida/patrón/peligro
 * (Shift=padrón, Ctrl=peligro). Devuelve un "unsub" para quitar el listener.
 */
export function bindContextInputOnCanvas(app: Application, w: World){
  const view = app.view as HTMLCanvasElement;
  const onCtx = (ev: MouseEvent) => {
    ev.preventDefault();
    if (ev.ctrlKey)       placeHazardFromScreen(app, w, ev);
    else if (ev.shiftKey) placePatternFromScreen(app, w, ev);
    else                  placeFoodFromScreen(app, w, ev, 10);
  };
  view.addEventListener("contextmenu", onCtx, { passive: false });
  return () => view.removeEventListener("contextmenu", onCtx);
}
