import type { World, Ant, Hex } from "../../../tipos";
import { CARRY_PER_TRIP, PICKUP_RADIUS, DROP_RADIUS, SEEK_K, MAX_SPEED } from "../../configuracion/predeterminados";

// utilidades locales simples
const d2 = (dx:number,dy:number)=>dx*dx+dy*dy;
const approach = (a:Ant, tx:number, ty:number, k=0.015)=>{
  a.vx = (a.vx??0) + (tx - a.x) * k;
  a.vy = (a.vy??0) + (ty - a.y) * k;
  a.x += a.vx; a.y += a.vy;
};

// === OBRERA: igual que tenías (memoria básica de recolección) ===
export function workerBrain(w:World, ant:Ant){
  const a:any = ant;
  const Q = w.hexes.find(h=>h.host==="queen");
  if (!Q) return;

  // acercamiento con "snap" y límite de velocidad
  const approachClamp = (ax:any, tx:number, ty:number):boolean => {
    const dx = tx - ax.x, dy = ty - ax.y;
    const d  = Math.hypot(dx, dy);
    if (d < 1.5){ // llegó
      ax.x = tx; ax.y = ty;
      ax.vx = (ax.vx ?? 0) * 0.4;
      ax.vy = (ax.vy ?? 0) * 0.4;
      return true;
    }
    ax.vx = (ax.vx ?? 0) + dx * SEEK_K;
    ax.vy = (ax.vy ?? 0) + dy * SEEK_K;
    const sp = Math.hypot(ax.vx, ax.vy);
    if (sp > MAX_SPEED){ ax.vx *= MAX_SPEED/sp; ax.vy *= MAX_SPEED/sp; }
    ax.x += ax.vx; ax.y += ax.vy;
    return false;
  };

  const nearestFood = ():any => {
    let best:any = null, bd = Infinity;
    for (const f of w.food){
      const rem = f.amount ?? 0; if (rem <= 0) continue;
      const dx = f.x - a.x, dy = f.y - a.y;
      const d  = dx*dx + dy*dy;
      if (d < bd){ bd = d; best = f; }
    }
    return best;
  };

  a.state = a.state ?? "seekFood";

  // Sin carga -> buscar comida (mantiene target si aún existe)
  if ((a.carryingUnits ?? 0) <= 0){
    if (!a._target || (a._target.amount ?? 0) <= 0){
      a._target = nearestFood();
      if (!a._target){
        // Letargo suave: volver a su hex (o reina) con pequeñísimo bamboleo
        const home = a.homeHexId ? (w.hexes.find(h=>h.id===a.homeHexId) ?? Q) : Q;
        approachClamp(a, home.cx + Math.sin((w as any)._tick*0.01)*3, home.cy + Math.cos((w as any)._tick*0.013)*3);
        return;
      }
    }
    const arrived = approachClamp(a, a._target.x, a._target.y);
    if (arrived || Math.hypot(a._target.x - a.x, a._target.y - a.y) < PICKUP_RADIUS){
      const take = Math.min(CARRY_PER_TRIP, a._target.amount ?? 0);
      if (take > 0){
        a._target.amount -= take;
        a.carryingUnits = take;
      }else{
        a._target = null;
      }
    }
  } else {
    // Con carga -> volver a la reina y depositar en Banco
    const arrived = approachClamp(a, Q.cx, Q.cy);
    if (arrived || Math.hypot(Q.cx - a.x, Q.cy - a.y) < DROP_RADIUS){
      const cu = a.carryingUnits ?? 0;
      if (cu > 0){
        w.stockFood  = (w.stockFood  ?? 0) + cu;
        w.stockTotal = (w.stockTotal ?? 0) + cu;
        a.carryingUnits = 0;
      }
      a._target = null;
    }
  }
}

// === CONSTRUCTORA: traslada huevos de la reina al hex objetivo ===
export function builderBrain(w:World, ant:Ant, _cx?:number, _cy?:number){
  const Q = w.hexes.find(h=>h.host==="queen");
  const m = w.meta;
  if (!Q || !m) return;

  // no hay traslado pendiente
  if (!m.broodTransferPending || !m.broodTargetHexId) return;

  const T = w.hexes.find(h=>h.id===m.broodTargetHexId) as Hex|undefined;
  if (!T) return;

  // Inicializa estructura de eggs en el target por si acaso
  (T as any).eggs = (T as any).eggs ?? { active:false, fed:0, tStart:(w as any)._tick??0, born:0, spots:[] };

  // 1) si no lleva huevo y aún hay huevos en la reina, ir a la reina y "cargar" uno
  if (!(ant as any).carryEgg){
    if (m.broodEggsStaged <= 0){ m.broodTransferPending = false; return; }
    approach(ant, Q.cx, Q.cy, 0.02);
    if (Math.hypot(ant.x-Q.cx, ant.y-Q.cy) < Q.sidePx*0.55){
      // toma un huevo
      (ant as any).carryEgg = true;
      m.broodEggsStaged -= 1;
    }
    return;
  }

  // 2) si lleva huevo, ir al hex objetivo
  approach(ant, T.cx, T.cy, 0.02);
  if (Math.hypot(ant.x-T.cx, ant.y-T.cy) < T.sidePx*0.55){
    // soltar huevo y marcarlo visible en un spot
    const E:any = (T as any).eggs;
    if (!E.spots || E.spots.length===0){
      // fallback: generar spots si no existen (no debería pasar, pero por si acaso)
      const r = T.sidePx*0.42;
      E.spots = [];
      for (let i=0;i<6;i++){
        const a = Math.PI/6 + i*(Math.PI/3);
        E.spots.push({x:T.cx+Math.cos(a)*r, y:T.cy+Math.sin(a)*r});
      }
    }
    E.born = (E.born??0) + 1;   // MotorDeRender dibuja tantos puntos naranjas como "born"
    E.active = true;
    (ant as any).carryEgg = false;

    // ¿completamos los 6? fin del traslado
    if (E.born>=6){
      m.broodTransferPending = false;
      m.broodTargetHexId = null;
      // aquí NO eclosionan aún: eso lo maneja tu SistemaCria cuando alimentes
    }
  }
}



/* ======================= NURSE BRAIN ======================= */

const NURSE_FEED_STEP = 5;        // alimenta de 5 en 5
const NURSE_FEED_FULL = 25;       // 25 und para eclosionar
const HATCH_WAIT_TICKS = 45 * 60; // 45s si 60 ticks/seg (ajústalo si tu reloj es distinto)

// utilidades locales sin tocar otras IA
function _q(w:World){ return w.hexes.find(h => (h as any).host === "queen") ?? null; }
function _d2(ax:number, ay:number, bx:number, by:number){ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }
function _approach(a:any, tx:number, ty:number, k:number, vmax=1.25){
  a.vx = (a.vx ?? 0) + (tx - a.x) * k;
  a.vy = (a.vy ?? 0) + (ty - a.y) * k;
  const sp = Math.hypot(a.vx, a.vy);
  if (sp > vmax) { a.vx *= vmax/sp; a.vy *= vmax/sp; }
  a.x += a.vx; a.y += a.vy;
}

/** Nurse: mueve huevos, alimenta, gestiona 4 nidos y late cuando está en reposo. */
export function nurseBrain(w:World, ant:Ant){
  const A:any = ant as any;
  const Q = _q(w); if (!Q) return;

  // velocidad ~ mitad del worker (k pequeño y vmax menor)
  const K = 0.006; const VMAX = 1.25;

  // halo pulsante en latencia
  A.pulse = A.pulse ?? 0.9;
  A._pulseDir = A._pulseDir ?? -1;

  // asignación de hasta 4 nidos (hex no-queen). Se mantiene viva al desaparecer/crearse hex.
  A.nests = (A.nests ?? []).filter((id:number)=> w.hexes.some(h => (h as any).id === id));
  if (A.nests.length < 4){
    for (const h of w.hexes){
      if ((h as any).host === "queen") continue;
      const id = (h as any).id;
      if (!A.nests.includes(id)) A.nests.push(id);
      if (A.nests.length >= 4) break;
    }
  }
  const nests = (A.nests as number[])
    .map(id => w.hexes.find(h => (h as any).id === id))
    .filter(Boolean) as any[];

  const eggs:any[] = (w as any).eggs ?? [];
  const atQueen = eggs.find(e => e.state === "atQueen");

  // 1) Si va cargando huevo => ir al primer nido disponible y soltar
  if (A.carryEggId != null){
    const egg = eggs.find(e => e.id === A.carryEggId);
    const nest = nests[0];
    if (!egg || !nest){ A.carryEggId = null; return; }

    _approach(A, nest.cx, nest.cy, K, VMAX);
    const near = _d2(A.x, A.y, nest.cx, nest.cy) < (nest.sidePx * nest.sidePx * 0.12);
    if (near){
      egg.state = "incubating";
      egg.targetHexId = nest.id;
      egg.fedUnd = egg.fedUnd ?? 0;
      egg.tStart = (w as any)._tick ?? 0;
      egg.hatchAt = egg.tStart + HATCH_WAIT_TICKS;
      A.carryEggId = null;
    }
    return;
  }

  // 2) Si hay huevo en la reina y hay nidos, ir por él y cargarlo
  if (atQueen && nests.length > 0){
    _approach(A, Q.cx, Q.cy, K, VMAX);
    const nearQ = _d2(A.x, A.y, Q.cx, Q.cy) < (Q.sidePx * Q.sidePx * 0.12);
    if (nearQ){
      A.carryEggId = atQueen.id;
      atQueen.state = "carried";
    }
    return;
  }

  // 3) Alimentación: busca huevos incubando en sus nidos y sube de 5 en 5 hasta 25
  const hungry = eggs.find(e => e.state === "incubating" && (A.nests ?? []).includes((e as any).targetHexId) && ((e.fedUnd ?? 0) < NURSE_FEED_FULL));
  if (hungry){
    const nest = w.hexes.find(h => (h as any).id === (hungry as any).targetHexId) as any;
    if (nest){
      _approach(A, nest.cx, nest.cy, K, VMAX);
      const near = _d2(A.x, A.y, nest.cx, nest.cy) < (nest.sidePx * nest.sidePx * 0.12);
      if (near){
        const bank = (w as any).stockFood ?? 0;
        if (bank >= NURSE_FEED_STEP){
          (w as any).stockFood = bank - NURSE_FEED_STEP;
          hungry.fedUnd = Math.min(NURSE_FEED_FULL, (hungry.fedUnd ?? 0) + NURSE_FEED_STEP);
        }
      }
    }
    return;
  }

  // 4) Latencia: ir al primer nido asignado (o a la reina si no hay) y hacer pulso
  const idleTarget:any = nests[0] ?? Q;
  _approach(A, idleTarget.cx, idleTarget.cy, K, VMAX);

  // pulso del glow (0.3..1.0)
  A.pulse += 0.02 * (A._pulseDir ?? -1);
  if (A.pulse < 0.3) { A.pulse = 0.3; A._pulseDir = 1; }
  else if (A.pulse > 1.0){ A.pulse = 1.0; A._pulseDir = -1; }
}



