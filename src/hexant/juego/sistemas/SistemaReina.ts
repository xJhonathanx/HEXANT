import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

const EGG_COST = 25;
const EGG_LAY_PERIOD = 30;
const MAX_EGGS_AT_QUEEN = 6;

/** La reina pone huevos (hasta 6 orbitando) sin depender de nidos libres.
 *  Si no hay nidos disponibles, las nurses NO los trasladarán y quedarán en la reina.
 */
export function SistemaReina(w:World, _cfg:Cfg){
  (w as any).eggs = (w as any).eggs ?? [];
  (w as any).nextEggId = (w as any).nextEggId ?? 1;
  w.stockFood = w.stockFood ?? 0;

  const q = w.hexes.find(h => h.host === "queen");
  const t = (w as any)._tick ?? 0;
  if (!q) return;

  const atQueen = (w.eggs as any[]).filter(e => e.state === "atQueen").length;

  if ((t % EGG_LAY_PERIOD) === 0 && atQueen < MAX_EGGS_AT_QUEEN && w.stockFood >= EGG_COST){
    w.stockFood -= EGG_COST;
    (w.eggs as any[]).push({
      id: (w as any).nextEggId++,
      x: q.cx, y: q.cy,
      state: "atQueen" as const,
      carrierId: null,
      targetHexId: null,
      fed: 0,
      tStart: t,
      hatchTicks: 0,
    });
  }
}
