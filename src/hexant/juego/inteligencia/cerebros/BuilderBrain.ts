import type { World, Ant, Hex } from "../../../tipos";

// Transporte por viaje (puedes ajustar)
const BUILDER_CARRY = 10;

// helpers locales (coinciden con los que usas en workers)
const d2 = (dx:number, dy:number) => dx*dx + dy*dy;
function approach(a: any, tx:number, ty:number, k = 0.012){
  a.vx = (a.vx ?? 0) + (tx - a.x) * k;
  a.vy = (a.vy ?? 0) + (ty - a.y) * k;
  a.x += a.vx; a.y += a.vy;
  a.vx *= 0.85; a.vy *= 0.85;
}

// Busca hex de la reina
function queenHex(w:World): Hex | null {
  return (w.hexes.find(h => (h as any).host === "queen") as Hex) ?? null;
}

// Hex objetivo de construcción (por meta o el primero incompleto)
function targetHex(w:World): Hex | null {
  const metaId = w.meta?.broodTargetHexId ?? null;
  let t = w.hexes.find(h => h.id === metaId && (h as any).completed === false) as Hex | undefined;
  if (!t) t = w.hexes.find(h => (h as any).completed === false && ((h as any).targetUnits ?? 0) > ((h as any).builtUnits ?? 0)) as Hex | undefined;
  return (t ?? null);
}

/** Cerebro de constructora: shuttling entre reina y obra. */
export function builderBrain(w:World, ant:Ant, _cx:number, _cy:number){
  if (ant.kind !== "builder") return;

  const q = queenHex(w);
  const t = targetHex(w);

  // Si no hay objetivo o reina: orbitar suave la reina
  if (!q || !t){
    const R = 30, wv = 0.02 * ((w as any)._tick ?? 0);
    const tx = (q?.cx ?? ant.x) + Math.cos(wv)*R;
    const ty = (q?.cy ?? ant.y) + Math.sin(wv)*R;
    approach(ant as any, tx, ty, 0.01);
    return;
  }

  // ¿Voy cargado? -> ir a obra y entregar
  if ((ant as any).carryingUnits > 0){
    approach(ant as any, t.cx, t.cy, 0.014);
    const near = d2((ant.x - t.cx), (ant.y - t.cy)) < (t.sidePx*t.sidePx*0.25);
    if (near){
      const built  = ((t as any).builtUnits ?? 0);
      const target = ((t as any).targetUnits ?? 100);
      const room   = Math.max(0, target - built);
      const give   = Math.min(room, (ant as any).carryingUnits);

      (t as any).builtUnits = built + give;
      (ant as any).carryingUnits -= give;

      if ((t as any).builtUnits >= target){
        (t as any).builtUnits = target;
        (t as any).completed = true;
        if (w.meta){
          w.meta.broodTransferPending = false;
          w.meta.broodTargetHexId = null;
        }
      }
    }
    return;
  }

  // Voy vacío -> ir a la reina y recoger del banco
  approach(ant as any, q.cx, q.cy, 0.014);
  const nearQ = d2((ant.x - q.cx), (ant.y - q.cy)) < (q.sidePx*q.sidePx*0.25);
  if (nearQ){
    const bank = (w.stockFood ?? 0);
    if (bank > 0){
      const take = Math.min(BUILDER_CARRY, bank);
      w.stockFood = bank - take;
      w.stockTotal = (w.stockTotal ?? 0) + 0; // (solo acumulador histórico si quieres)
      (ant as any).carryingUnits = take;
    }
  }
}
