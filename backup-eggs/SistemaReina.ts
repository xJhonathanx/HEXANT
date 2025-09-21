import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";
import { EGG_COST, EGG_LAY_PERIOD, MAX_EGGS_AT_QUEEN } from "../configuracion/predeterminados";

/**
 * La reina pone 1 huevo cada EGG_LAY_PERIOD ticks si hay comida en el Banco.
 * Cada huevo cuesta EGG_COST und y aparece como punto naranja en su hex.
 */
export function SistemaReina(w:World, _cfg:Cfg){
  const q = w.hexes.find(h=>h.host==="queen");
  if (!q) return;

  // meta mínima
  const m:any = w.meta ?? (w.meta = { broodEggsStaged:0, broodTargetHexId:null, broodTransferPending:false, buildCooldownTicks:0 });

  // batch de huevos en el hex de la reina
  q.eggs = q.eggs ?? { active:false, fed:0, tStart:(w as any)._tick ?? 0, born:0, spots:[] };

  // precomputar 6 "spots" interiores cerca de los vértices
  if (!q.eggs.spots || q.eggs.spots.length !== 6){
    const S = q.sidePx;
    const r = S * 0.58;
    const spots = [];
    for (let i=0;i<6;i++){
      const ang = Math.PI/6 + i*(Math.PI/3);
      spots.push({ x: q.cx + r*Math.cos(ang), y: q.cy + r*Math.sin(ang) });
    }
    q.eggs.spots = spots;
  }

  // temporizador de puesta
  m._eggTimer = (m._eggTimer ?? 0) + 1;

  // reglas de postura
  const bank = w.stockFood ?? 0;
  const have = q.eggs.born ?? 0;
  if (bank < EGG_COST) return;
  if (have >= MAX_EGGS_AT_QUEEN) return;
  if (m._eggTimer < EGG_LAY_PERIOD) return;

  // poner 1 huevo
  w.stockFood = (w.stockFood ?? 0) - EGG_COST;
  q.eggs.active = true;
  q.eggs.born = have + 1;
  m.broodEggsStaged = (m.broodEggsStaged ?? 0) + 1;

  // reset timer
  m._eggTimer = 0;
}
