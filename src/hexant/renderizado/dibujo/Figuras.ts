/**
 * Figuras.ts — helpers de dibujo (Pixi v8).
 * Usamos utilidades de hex para calcular vértices.
 */
import { Graphics } from "pixi.js";
import { hexVertices } from "../../utilidades/hex";

/** Devuelve puntos [x1,y1, x2,y2, ...] del hex pointy-top. */
export function hexPoints(cx:number, cy:number, side:number): number[] {
  const v = hexVertices(cx, cy, side);
  const pts: number[] = [];
  for (const p of v) { pts.push(p.x, p.y); }
  return pts;
}

/** Contorno de hexágono. */
export function drawHexWire(g:Graphics, cx:number, cy:number, side:number, color=0xffffff, width=3){
  g.clear();
  g.poly(hexPoints(cx,cy,side), true).stroke({ width, color });
}

/** Círculo sólido. */
export function drawDisc(g:Graphics, x:number, y:number, r:number, color=0xffffff){
  g.clear();
  g.circle(x, y, r).fill(color);
}

/** Segmento simple. */
export function drawSegment(g:Graphics, ax:number, ay:number, bx:number, by:number, color=0xffffff, width=2){
  g.clear();
  g.moveTo(ax, ay).lineTo(bx, by).stroke({ color, width });
}
