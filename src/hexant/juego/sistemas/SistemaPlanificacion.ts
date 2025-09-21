import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";
import { axialToPixelPT } from "../../utilidades/hex";

const DIRS: Array<[number, number]> = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];

export function SistemaPlanificacion(w: World, _cfg: Cfg) {
  const qh = w.hexes.find(h => (h as any).host === "queen");
  if (!qh) return;

  // meta segura
  (w as any).meta ??= {};
  const m = (w as any).meta;

  // si ya hay un objetivo, no replantear
  if (m.buildTargetHexId) return;

  // huevos "en la reina" (con la cadena correcta)
  const eggsAtQueen = (w.eggs ?? []).filter(e => e.state === "atQueen").length;
  if (eggsAtQueen < 6) return;

  // requiere una constructora viva
  if (!w.ants.some(a => a.kind === "builder")) return;

  // buscar vecino libre
  const S = (qh as any).sidePx;
  const aq = (qh as any).aq ?? 0;
  const ar = (qh as any).ar ?? 0;

  for (let i = 0; i < 12; i++) {
    const d = DIRS[(Math.random() * 6) | 0];
    const nq = aq + d[0], nr = ar + d[1];
    if (w.hexes.some(h => (h as any).aq === nq && (h as any).ar === nr)) continue;

    const p = axialToPixelPT(nq, nr, S);
    const hx: any = {
      id: w.nextHexId++,
      cx: (qh as any).cx + p.x, cy: (qh as any).cy + p.y,
      sidePx: S, aq: nq, ar: nr,
      host: "builder",
      completed: false,
      builtUnits: 0,
      targetUnits: 100, // coste total en unidades de banco
      eggs: { born: 0, active: false, fed: 0, spots: [] }
    };
    w.hexes.push(hx);
    m.buildTargetHexId = hx.id; // marcar objetivo
    break;
  }
}
