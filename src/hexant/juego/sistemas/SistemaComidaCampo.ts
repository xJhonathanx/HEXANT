import type { World } from "../../tipos";
import { FOOD_FIELD_REFRESH_SEC, FOOD_FIELD_TARGET_UNITS, FOOD_NODE_SIZE, TICKS_PER_SEC } from "../configuracion/predeterminados";
import { axialToPixelPT } from "../../utilidades/hex";

function lcg(seed:number){ // RNG simple y estable
  let s = seed >>> 0;
  return ()=> (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

export function SistemaComidaCampo(w:World){
  const t = (w as any)._tick ?? 0;
  const q = w.hexes.find(h => (h as any).host === "queen");
  if (!q) return;

  // meta init
  (w as any).meta = (w as any).meta ?? {};
  const meta:any = (w as any).meta;
  meta.foodField = meta.foodField ?? {
    seed: 0xA17C5EED, nextRefreshTick: 0, lastRadius: undefined, cells: undefined
  };
  const ff:any = meta.foodField;

  // radio AIR actual
  const R = (meta.domeRadius ?? (w as any).domeRadius ?? ((q as any).sidePx * 6)) as number;

  // cache de celdas elegibles (centro dentro de AIR) – recalc si cambia el radio
  if (!ff.cells || ff.lastRadius == null || Math.abs(ff.lastRadius - R) > 0.5){
    ff.cells = {};
    const S = (q as any).sidePx as number;
    const rings = Math.ceil(R / (S * 1.0)) + 2; // un poco de holgura
    for (let ar = -rings; ar <= rings; ar++){
      for (let aq = -rings; aq <= rings; aq++){
        const { x, y } = axialToPixelPT(aq, ar, S);
        const cx = q.cx + x, cy = q.cy + y;
        if (Math.hypot(cx - q.cx, cy - q.cy) <= R){
          ff.cells[`${aq},${ar}`] = { q:aq, r:ar, x:cx, y:cy };
        }
      }
    }
    ff.lastRadius = R;
  }

  // ¿toca refrescar?
  if (t < (ff.nextRefreshTick ?? 0)) return;
  ff.nextRefreshTick = t + FOOD_FIELD_REFRESH_SEC * TICKS_PER_SEC;

  // total actual de comida dentro del AIR
  let total = 0;
  for (const f of w.food){
    if ((f as any).amount <= 0) continue;
    if (Math.hypot(f.x - q.cx, f.y - q.cy) <= R) total += (f as any).amount;
  }

  const deficit = Math.max(0, FOOD_FIELD_TARGET_UNITS - total);
  if (deficit <= 0) return;

  const needNodes = Math.ceil(deficit / FOOD_NODE_SIZE);
  const cells = Object.values(ff.cells as Record<string, any>);
  if (!cells.length) return;

  // barajar índices con RNG estable (seed + tick)
  const rand = lcg((ff.seed ^ t) >>> 0);
  const idx = Array.from({length: cells.length}, (_,_i)=>_i);
  for (let i = idx.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }

  let placed = 0;
  for (let k = 0; k < idx.length && placed < needNodes; k++){
    const c = cells[idx[k]];
    // evita apilar exactamente en el mismo centro (tolerancia 1px)
    const near = w.food.find(f => Math.hypot(f.x - c.x, f.y - c.y) < 1.0 && (f as any).amount > 0);
    if (near) continue;
    w.food.push({ x:c.x, y:c.y, amount: FOOD_NODE_SIZE, initial: FOOD_NODE_SIZE });
    placed++;
  }
}
