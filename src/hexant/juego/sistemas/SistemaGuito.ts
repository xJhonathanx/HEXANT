import type { World, Hex } from "../../tipos";
import { HATCH_TIME } from "../configuracion/predeterminados";

const TICKS_PER_SEC = 60;
// Producción total = 5 * H^2 por segundo (ejemplo: H=4 -> 80/s)
// cada guito activo produce (5 * H) por segundo.
function countCompletedNests(w:World){
  return w.hexes.filter(h => h.host!=="queen" && (h as any).completed).length;
}

const DIRS: Array<[number, number]> = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];

function neighborOf(w:World, h:Hex, d:[number,number]){
  const aq = (h as any).aq ?? 0, ar = (h as any).ar ?? 0;
  const nq = aq + d[0], nr = ar + d[1];
  return w.hexes.find(x => (x as any).aq===nq && (x as any).ar===nr) ?? null;
}

/** Guito (hongo):
 * - Al completarse un hex (no reina) aparece guito.fed=0.
 * - Las obreras lo "alimentan" simbólicamente desde el banco: 5 und cada 1 s hasta 25.
 * - Al llegar a 25, comienza cuenta de 30 s y se activa. 
 * - Activo: producción por guito = (5 * H) und/seg (H = #hex completados no-reina).
 * - Conexiones: líneas 1px entre hexes vecinos con guito activo; pulsos aleatorios.
 */
export function SistemaGuito(w:World){
  const t = (w as any)._tick ?? 0;
  (w as any).meta = (w as any).meta ?? {};
  const meta:any = w.meta;

  // 1) asegurar guito en hex completados (no reina)
  for (const h of w.hexes){
    if (h.host==="queen") continue;
    if (!(h as any).completed) continue;
    (h as any).guito = (h as any).guito ?? { fed:0, active:false, activateAt:null };
  }

  // 2) alimentación "por viajes" desde el banco: 5 und cada 1 s
  if ((t % TICKS_PER_SEC) === 0){
    for (const h of w.hexes){
      const G:any = (h as any).guito;
      if (!G || G.active) continue;
      if ((G.fed ?? 0) < 25){
        const bank = (w as any).stockFood ?? 0;
        const take = Math.min(5, 25 - (G.fed ?? 0), bank);
        if (take > 0){
          (w as any).stockFood = bank - take;
          G.fed = (G.fed ?? 0) + take;
        }
      }
      if ((G.fed ?? 0) >= 25){
        G.activateAt = G.activateAt ?? (t + 30*TICKS_PER_SEC); // 30s
      }
    }
  }

  // 3) cambio de estado a activo cuando llegue su tiempo
  for (const h of w.hexes){
    const G:any = (h as any).guito;
    if (!G || G.active !== false) continue;
    if ((G.activateAt ?? 0) > 0 && t >= (G.activateAt ?? 0)){
      G.active = true;
    }
  }

  // 4) producción
  const H = countCompletedNests(w);
  const perGuitoPerTick = (5 * H) / TICKS_PER_SEC; // und/tick por guito
  if (H > 0){
    for (const h of w.hexes){
      const G:any = (h as any).guito;
      if (!G?.active) continue;
      (w as any).stockFood = ((w as any).stockFood ?? 0) + perGuitoPerTick;
    }
  }

  // 5) conexiones y pulsos visuales (almacenados en meta.guitoPulses)
  const activeIds = new Set<number>(w.hexes.filter(h => !!(h as any).guito?.active).map(h=>h.id));
  const conns: Array<[number,number]> = [];
  for (const h of w.hexes){
    if (!activeIds.has(h.id)) continue;
    for (const d of DIRS){
      const nb = neighborOf(w,h,d);
      if (!nb || !activeIds.has(nb.id)) continue;
      const a = Math.min(h.id, nb.id), b = Math.max(h.id, nb.id);
      // evita duplicados
      if (!conns.some(c => c[0]===a && c[1]===b)) conns.push([a,b]);
    }
  }

  meta.guitoPulses = meta.guitoPulses ?? [];
  // avanzar pulsos
  meta.guitoPulses = meta.guitoPulses.filter((p:any)=> (p.t+=p.speed) < 1.0);

  // spawn aleatorio (si hay conexiones)
  if (conns.length > 0 && (t % 12)===0 && Math.random() < 0.35){
    const [a,b] = conns[(Math.random()*conns.length)|0];
    meta.guitoPulses.push({ a, b, t: 0, speed: 0.06 + Math.random()*0.03 });
  }
}
