import type { World, Hex, Decoration } from "../tipos";
import { dist2 } from "./matematica";

/** Hex más cercano con stock > 0 */
export function nearestHexWithStock(w:World, x:number, y:number): Hex | null {
  let best: Hex | null = null;
  let bestd = Infinity;
  for(const h of w.hexes){
    if ((h.stockUnd ?? 0) <= 0) continue;
    const d2 = dist2(x,y,h.cx,h.cy);
    if (d2 < bestd){ bestd = d2; best = h; }
  }
  return best;
}

/** Hex de la constructora o el de la reina si no existe */
export function findBuilderHex(w:World): Hex | null {
  const b = w.hexes.find(h => h.host === "builder");
  return b ?? w.hexes.find(h => h.host === "queen") ?? null;
}
