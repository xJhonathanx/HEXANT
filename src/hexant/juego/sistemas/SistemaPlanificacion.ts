import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";
import { axialToPixelPT } from "../../utilidades/hex";

const DIRS: Array<[number,number]> = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];

function eggSpots(cx:number, cy:number, S:number){
  const r = S * 0.42;             // anillo interior
  const out = [];
  for (let i=0;i<6;i++){
    const a = Math.PI/6 + i*(Math.PI/3);
    out.push({ x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r });
  }
  return out;
}

export function SistemaPlanificacion(w:World, _cfg:Cfg){
  const qh = w.hexes.find(h=>h.host==="queen");
  if (!qh || !w.meta) return;

  if (w.meta.broodTransferPending || w.meta.broodTargetHexId) return;
  if (w.meta.broodEggsStaged < 6) return;
  if (!w.ants.some(a=>a.kind==="builder")) return;

  const S = qh.sidePx, aq = qh.aq ?? 0, ar = qh.ar ?? 0;
  for (let i=0;i<12;i++){
    const d = DIRS[(Math.random()*6)|0];
    const nq = aq + d[0], nr = ar + d[1];
    if (w.hexes.some(h=>h.aq===nq && h.ar===nr)) continue;

    const p = axialToPixelPT(nq,nr,S);
    const cx = qh.cx + p.x, cy = qh.cy + p.y;

    const hx:any = {
      id: w.nextHexId++,
      cx, cy, sidePx:S,
      host:"worker", capacity:10, occupancy:0,
      completed:false, builtUnits:0, targetUnits:6,
      aq:nq, ar:nr,
      eggs: { active:false, fed:0, tStart:(w as any)._tick??0, born:0, spots: eggSpots(cx,cy,S) }
    };
    w.hexes.push(hx);

    w.meta.broodTargetHexId = hx.id;
    w.meta.broodTransferPending = true;
    return;
  }
}

