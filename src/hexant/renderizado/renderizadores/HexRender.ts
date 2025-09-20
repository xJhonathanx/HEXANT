/**
 * HexRender.ts  dibujo de un nodo hex (contorno + color por host).
 */
import { Graphics } from "pixi.js";
import { drawHexWire } from "../dibujo/Figuras";

export type HostKind = "worker" | "builder" | "soldier" | "queen";

export function colorPorHost(host: HostKind): number {
  if (host==="queen")   return 0xff2bd6;
  if (host==="builder") return 0xff9e66;
  if (host==="soldier") return 0xffe25a;
  return 0xff4a9e; // worker
}

export function dibujarHex(g: Graphics, cx:number, cy:number, side:number, host: HostKind){
  const col = colorPorHost(host);
  drawHexWire(g, cx, cy, side, col, 3);
}
