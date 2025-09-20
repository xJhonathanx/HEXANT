/**
 * HormigaRender.ts  disco con color por tipo.
 */
import { Graphics } from "pixi.js";

export type AntKind = "worker" | "soldier" | "builder";

export function colorPorHormiga(kind: AntKind, carrying=false, waiting=false): number {
  if (kind==="soldier") return 0xffd166;
  if (kind==="builder") return 0xff9e66;
  if (waiting)         return 0xffe08a;
  if (carrying)        return 0xbdfcc9;
  return 0x59f79b;
}

export function dibujarHormiga(g: Graphics, x:number, y:number, kind: AntKind, opts?: {carrying?:boolean; waiting?:boolean;}){
  const r = kind==="soldier" ? 4 : kind==="builder" ? 3.6 : 3.1;
  const col = colorPorHormiga(kind, opts?.carrying, opts?.waiting);
  g.clear();
  g.circle(x, y, r).fill(col);
}
