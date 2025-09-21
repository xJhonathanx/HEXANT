import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";
import { axialToPixelPT } from "../../utilidades/hex";

const DIRS: Array<[number,number]> = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];

export function SistemaPlanificacion(w:World, _cfg:Cfg){
  const qh = w.hexes.find(h => (h as any).host === "queen");
  if (!qh || !w.meta) return;

  if (w.meta.broodTransferPending || w.meta.broodTargetHexId) return;

  //  Estado correcto de los huevos en la reina
  const eggsAtQueen = (w.eggs ?? []).filter(e => e.state === "atQueen").length;
  if (eggsAtQueen < 6) return;

  const hasBuilder = w.ants.some(a => a.kind === "builder");
  if (!hasBuilder) return;

  const S = (qh as any).sidePx, aq = (qh as any).aq ?? 0, ar = (qh as any).ar ?? 0;
  for (let i=0; i<8; i++){
    const [dq, dr] = DIRS[(Math.random()*6)|0];
    const nq = aq + dq, nr = ar + dr;
    if (w.hexes.some(h => (h as any).aq === nq && (h as any).ar === nr)) continue;

    const p = axialToPixelPT(nq, nr, S);
    const hx:any = {
      id: w.nextHexId++,
      cx: qh.cx + p.x, cy: qh.cy + p.y, sidePx: S,
      host: "worker", capacity: 10, occupancy: 0,
      completed: false, builtUnits: 0, targetUnits:100,
      aq: nq, ar: nr
    };
    w.hexes.push(hx);

    w.meta.broodTargetHexId = hx.id;
    w.meta.broodTransferPending = true;
    return;
  }
}



