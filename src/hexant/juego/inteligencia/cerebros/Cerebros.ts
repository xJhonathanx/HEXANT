import type { World, Ant } from "../../tipos";
import { CARRY_PER_TRIP, EGGS_NEED_UND } from "../../juego/configuracion/predeterminados";

// Helpers
const d2 = (dx:number,dy:number)=>dx*dx+dy*dy;
const approach = (a:Ant, tx:number, ty:number, k=0.012)=>{
  a.vx += (tx - a.x) * k;
  a.vy += (ty - a.y) * k;
};

// Home-hex (si falla, vuelve a la reina)
function homeCenter(w:World, a:Ant){
  if (a.homeHexId){
    const h = w.hexes.find(h=>h.id===a.homeHexId);
    if (h) return {x:h.cx, y:h.cy};
  }
  const Q = w.hexes.find(h=>h.host==="queen")!;
  return {x:Q.cx,y:Q.cy};
}

// ================== BRAINS ==================

export function workerBrain(w:World, ant:Ant){
  // smell simple: cualquier comida
  const f = w.food.find(f=>f.amount>0);
  if (f){
    const need = Math.min(CARRY_PER_TRIP, f.amount);
    const need2 = (need>0);
    // ir a por comida
    approach(ant, f.x, f.y, 0.02);
    if (d2(ant.x-f.x, ant.y-f.y)<16){
      // carga
      const take = Math.min(CARRY_PER_TRIP, f.amount);
      ant.carryingUnits = (ant.carryingUnits||0) + take;
      f.amount -= take;
    }
    // si va cargado: depositar en hex home:true (reina)
    if ((ant.carryingUnits||0)>0){
      const depot = w.hexes.find(h=>h.host==="queen")!;
      approach(ant, depot.cx, depot.cy, 0.03);
      if (d2(ant.x-depot.cx, ant.y-depot.cy)<36){
        w.foodUnits = (w.foodUnits||0) + ant.carryingUnits!;
        ant.carryingUnits = 0;
      }
    }
    return;
  }

  // No hay comida => orbitar su propio hex
  const H = homeCenter(w, ant);
  const t = (w as any)._tick ?? 0;
  const r = 24;
  const ang = (t*0.06 + ant.id*0.8) % (Math.PI*2);
  approach(ant, H.x + r*Math.cos(ang), H.y + r*Math.sin(ang), 0.015);
}

export function builderBrain(w:World, ant:Ant){
  const Q = w.hexes.find(h=>h.host==="queen"); if (!Q || !w.meta) return;

  // Si no lleva huevo y hay huevos en la reina (broodEggsStaged)
  if (!(ant as any).carryEgg && w.meta.broodEggsStaged>0){
    // acercarse a la reina y pegar un huevo visual
    approach(ant, Q.cx, Q.cy, 0.03);
    if (d2(ant.x-Q.cx, ant.y-Q.cy)<42){
      (ant as any).carryEgg = true;         // flag visual
      w.meta.broodEggsStaged -= 1;          // sale 1 del pool de la reina
    }
    return;
  }

  // Si lleva huevo: ir al hex objetivo y colocarlo
  if ((ant as any).carryEgg && w.meta.broodTargetHexId){
    const T = w.hexes.find(h=>h.id===w.meta!.broodTargetHexId);
    if (T){
      approach(ant, T.cx, T.cy, 0.03);
      if (d2(ant.x-T.cx, ant.y-T.cy)<64){
        // "colocar" el huevo en la siguiente spot libre (born marca cuántos colocados)
        const born = (T.eggs?.born ?? 0);
        if (T.eggs?.spots && born < T.eggs.spots.length){
          T.eggs.born = born + 1;   // ahora aparece 1 punto naranja en MotorDeRender
        }
        (ant as any).carryEgg = false;

        // Cuando tenga 6 colocados => activar nido y empezar a alimentar
        if (T.eggs && T.eggs.born>=6){
          T.eggs.active = true;
        }
      }
    }
    return;
  }

  // Si no hay tarea: orbitar su propio hex (idle)
  const H = homeCenter(w, ant);
  const t = (w as any)._tick ?? 0;
  const r = 28;
  const ang = (t*0.05 + ant.id*0.7) % (Math.PI*2);
  approach(ant, H.x + r*Math.cos(ang), H.y + r*Math.sin(ang), 0.013);
}
