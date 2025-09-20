import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";
import { axialToPixelPT } from "../../utilidades/hex";

// 6 direcciones axial (pointy-top)
const DIRS: Array<[number,number]> = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];

// Calcula 6 posiciones interiores cercanas a los vértices, para dibujar huevos "dentro" del hex.
function eggSpots(cx:number, cy:number, side:number){
  const r = side * 0.62;            // radio interior (un poco hacia dentro del vértice)
  const a0 = Math.PI/6;             // 30, pointy-top
  const pts = [];
  for (let k=0;k<6;k++){
    const ang = a0 + k*(Math.PI/3);
    pts.push({ x: cx + r*Math.cos(ang), y: cy + r*Math.sin(ang) });
  }
  return pts;
}

export function SistemaPlanificacion(w:World, _cfg:Cfg){
  const qh = w.hexes.find(h=>h.host==="queen");
  if (!qh || !w.meta) return;
  if (w.meta.broodTransferPending || w.meta.broodTargetHexId) return;
  if (w.meta.broodEggsStaged < 6) return;                  // regla: 6 huevos listos
  if (!w.ants.some(a=>a.kind==="builder")) return;          // debe existir constructora

  // Elige una base para expandir: algún hex NO reina; si no hay, usa la reina.
  const bases = w.hexes.filter(h=>h.host!=="queen");
  const base = bases.length ? bases[(Math.random()*bases.length)|0] : qh;
  const aq = base.aq ?? 0, ar = base.ar ?? 0;
  const S = qh.sidePx;

  // Intenta hasta 12 vecinos al azar
  for (let t=0; t<12; t++){
    const d = DIRS[(Math.random()*6)|0];
    const nq = aq + d[0], nr = ar + d[1];
    if (w.hexes.some(h=>h.aq===nq && h.ar===nr)) continue; // ocupado

    const p = axialToPixelPT(nq, nr, S);
    const cx = qh.cx + p.x;
    const cy = qh.cy + p.y;

    const hx:any = {
      id: w.nextHexId++,
      cx, cy, sidePx: S,
      host: "worker",
      capacity: 10,
      occupancy: 0,
      completed: false,
      builtUnits: 0,
      targetUnits: 6,         // 6 unidades (huevos) para completar la obra
      aq: nq, ar: nr,
      eggs: {                 // nido del nuevo hex
        active: false, born: 0, fed: 0, tStart: 0,
        spots: eggSpots(cx, cy, S)  // pre-ubicaciones dentro
      }
    };
    w.hexes.push(hx);
    w.meta.broodTargetHexId = hx.id;
    w.meta.broodTransferPending = true;
    return;
  }
}
