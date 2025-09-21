import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

// Valores coherentes con lo que venimos usando
const EGG_COST = 25;         // 25 und por huevo
const EGG_LAY_PERIOD = 30;   // 1 huevo cada ~30 ticks
const MAX_EGGS_AT_QUEEN = 6; // tope en la reina

export function SistemaReina(w:World, _cfg:Cfg){
  // Garantías de estructura
  (w as any).eggs = (w as any).eggs ?? [];
  (w as any).nextEggId = (w as any).nextEggId ?? 1;
  w.stockFood = w.stockFood ?? 0;

  const q = w.hexes.find(h => h.host === "queen");
  const t = (w as any)._tick ?? 0;
  if (!q) return;

  // Huevos que orbitan en la reina
  const atQueen = (w.eggs as any[]).filter(e => e.state === "atQueen").length;

  // Postura: coste, periodo, y tope
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
