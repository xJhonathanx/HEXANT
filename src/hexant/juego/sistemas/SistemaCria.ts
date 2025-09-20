/** SistemaCria  requiere comida y tiempo; TTL 5 min si no se alimenta. */
import type { World, Ant } from "../../tipos";
import { EGGS_NEED_UND, HATCH_TIME, EGGS_TTL_TICKS } from "../configuracion/predeterminados";

function spawnAnt(w:World, x:number, y:number, kind:"worker"|"builder"|"soldier", homeHexId:number|null):Ant{
  return {
    id: w.nextAntId++, kind, x, y,
    vx:(Math.random()*0.6-0.3), vy:(Math.random()*0.6-0.3),
    state: kind==="builder" ? "building" : "foraging",
    ageTicks:0, homeHexId,
    hungerUnd:0, starveTicks:0, carryingUnits:0, carryingDecoId:null, carryingEgg:false,
    lastFoodPos:null, attackCd:0, energyPct:100, totalDistPx:0, waitTicks:0, targetHexId:null
  };
}

export function SistemaCria(w:World){
  for (const h of w.hexes){
    if (!h.eggs || !h.eggs.active) continue;

    // edad para TTL
    h.eggs.ageTicks = (h.eggs.ageTicks ?? 0) + 1;
    if ((h.eggs.fed ?? 0) < EGGS_NEED_UND && (h.eggs.ageTicks ?? 0) >= EGGS_TTL_TICKS){
      // caducaron por no alimentar
      h.eggs.active = false; h.eggs.count = 0;
      continue;
    }

    // solo cuentan hatchTicks si ya están alimentados
    if (h.eggs.fed >= EGGS_NEED_UND){
      if (h.eggs.hatchTicks > 0) h.eggs.hatchTicks--;
      if (h.eggs.hatchTicks <= 0){
        // ratio: 1 builder cada 10 obreras vivas aprox.
        const workers = w.ants.filter(a=>a.kind==="worker").length;
        const builders = w.ants.filter(a=>a.kind==="builder").length;
        const makeBuilders = builders < Math.floor(workers/10) ? 1 : 0;
        const makeWorkers  = Math.max(0, h.eggs.count - makeBuilders);

        for (let i=0;i<makeBuilders;i++) w.ants.push(spawnAnt(w, h.cx, h.cy, "builder", h.id));
        for (let i=0;i<makeWorkers;i++)  w.ants.push(spawnAnt(w, h.cx, h.cy, "worker",  h.id));

        h.eggs.active = false;
      }
    }
  }
}
