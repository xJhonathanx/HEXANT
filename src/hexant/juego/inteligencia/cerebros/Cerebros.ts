import type { World, Ant, Hex } from "../../../tipos";
import { CARRY_PER_TRIP, PICKUP_RADIUS, DROP_RADIUS, SEEK_K, MAX_SPEED, SMELL_RADIUS, INFLUENCE_BASE_PX, INFLUENCE_PER_HEX_PX, HATCH_TIME } from "../../configuracion/predeterminados";

/* ===== Utils ===== */
const d2 = (dx:number,dy:number)=>dx*dx+dy*dy;
const approach = (a:Ant, tx:number, ty:number, k=0.015)=>{
  a.vx = (a.vx??0) + (tx - a.x) * k;
  a.vy = (a.vy??0) + (ty - a.y) * k;
  a.x += a.vx; a.y += a.vy;
};
function domeRadius(w:World){
  const nonQueen = w.hexes.filter(h=>h.host!=="queen").length;
  return INFLUENCE_BASE_PX + nonQueen*INFLUENCE_PER_HEX_PX;
}
function innerVertex(h:Hex, slot:number){
  const r = (h as any).sidePx * 0.72;
  const ang = Math.PI/6 + (slot%6)*(Math.PI/3);
  return { x: h.cx + Math.cos(ang)*r, y: h.cy + Math.sin(ang)*r };
}

/* ================== WORKER (con memoria y domo) ================== */
export function workerBrain(w:World, ant:Ant){
  const a:any = ant;
  const Q = w.hexes.find(h=>h.host==="queen"); if (!Q) return;

  if (a.spawnSlot == null) a.spawnSlot = (a.id ?? 1) % 6;
  const R = domeRadius(w), smell = SMELL_RADIUS;

  const approachClamp = (ax:any, tx:number, ty:number):boolean => {
    const dx = tx - ax.x, dy = ty - ax.y;
    const d  = Math.hypot(dx, dy);
    if (d < 1.5){ ax.x = tx; ax.y = ty; ax.vx = (ax.vx ?? 0) * 0.4; ax.vy = (ax.vy ?? 0) * 0.4; return true; }
    ax.vx = (ax.vx ?? 0) + dx * SEEK_K;
    ax.vy = (ax.vy ?? 0) + dy * SEEK_K;
    const sp = Math.hypot(ax.vx, ax.vy);
    if (sp > MAX_SPEED){ ax.vx *= MAX_SPEED/sp; ax.vy *= MAX_SPEED/sp; }
    ax.x += ax.vx; ax.y += ax.vy;
    return false;
  };

  const nearestFood = ():any => {
    let best:any = null, bd = Infinity;

    // preferencia por última posición recordada
    let hint:any = null;
    if (a.lastFoodPos){
      const near = w.food.find(f => (f.amount??0)>0 && Math.hypot(f.x-a.lastFoodPos.x, f.y-a.lastFoodPos.y) < 12);
      if (near) hint = near; else a.lastFoodPos = null;
    }

    for (const f of w.food){
      const rem = f.amount ?? 0; if (rem <= 0) continue;
      if (Math.hypot(f.x-Q.cx, f.y-Q.cy) > R) continue;              // fuera del domo
      if (Math.hypot(f.x-a.x, f.y-a.y) > smell) continue;            // fuera del olfato

      const dd = d2(f.x-a.x, f.y-a.y);
      if (dd < bd){ bd = dd; best = f; }
    }

    return hint ?? best;
  };

  a.state = a.state ?? "seekFood";

  if ((a.carryingUnits ?? 0) <= 0){
    if (!a._target || (a._target.amount ?? 0) <= 0) a._target = nearestFood();

    if (!a._target){
      const v = innerVertex((a.homeHexId ? (w.hexes.find(h=>h.id===a.homeHexId) ?? Q) : Q) as Hex, a.spawnSlot);
      const t = (w as any)._tick||0;
      return void approachClamp(a, v.x + Math.sin(t*0.03 + a.id)*1.8, v.y + Math.cos(t*0.037 + a.id)*1.8);
    }

    const arrived = approachClamp(a, a._target.x, a._target.y);
    if (arrived || Math.hypot(a._target.x - a.x, a._target.y) < PICKUP_RADIUS){
      const take = Math.min(CARRY_PER_TRIP, a._target.amount ?? 0);
      if (take > 0){
        a._target.amount -= take;
        a.carryingUnits = take;
        a.lastFoodPos = { x: a._target.x, y: a._target.y };
      } else {
        a._target = null;
      }
    }
  } else {
    const arrived = approachClamp(a, Q.cx, Q.cy);
    if (arrived || Math.hypot(Q.cx - a.x, Q.cy - a.y) < DROP_RADIUS){
      const cu = a.carryingUnits ?? 0;
      if (cu > 0){
        w.stockFood  = (w.stockFood  ?? 0) + cu;
        w.stockTotal = (w.stockTotal ?? 0) + cu;
        a.carryingUnits = 0;
      }
      if (a.lastFoodPos){
        const again = w.food.find(f => (f.amount??0)>0 && Math.hypot(f.x-a.lastFoodPos.x, f.y-a.lastFoodPos.y) < 12);
        a._target = again ?? null;
        if (!again) a.lastFoodPos = null;
      } else {
        a._target = null;
      }
    }
  }
}

/* ================== BUILDER ================== */
export function builderBrain(w:World, ant:Ant, _cx?:number, _cy?:number){
  const A:any = ant;
  const Q = w.hexes.find(h=>h.host==="queen");
  const m = w.meta as any;
  if (!Q){ return; }

  if (m?.buildTargetHexId){
    const T = w.hexes.find(h=>h.id===m.buildTargetHexId) as Hex|undefined;
    if (T){
      const slot = (A.id ?? 1) % 6;
      const v = innerVertex(T, slot);
      approach(A, v.x, v.y, 0.02);
      A.vx *= 0.9; A.vy *= 0.9;
      return;
    }
  }

  // órbita estable alrededor de la reina
  const t = ((w as any)._tick ?? 0);
  const phase = (A.id % 6) * (Math.PI/3);
  const R = ((Q as any).sidePx ?? 36) + 18;
  const tx = Q.cx + Math.cos(t*0.05 + phase) * R;
  const ty = Q.cy + Math.sin(t*0.05 + phase) * R;
  approach(A, tx, ty, 0.06);
  A.vx *= 0.9; A.vy *= 0.9;
}

/* ================== NURSE ================== */
const NURSE_FEED_STEP = 5;        // por viaje
const NURSE_FEED_FULL = 25;       // 5 viajes

function _q(w:World){ return w.hexes.find(h => (h as any).host === "queen") ?? null; }
function _d2(ax:number, ay:number, bx:number, by:number){ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }
function _approach(a:any, tx:number, ty:number, k:number, vmax:number){
  a.vx = (a.vx ?? 0) + (tx - a.x) * k;
  a.vy = (a.vy ?? 0) + (ty - a.y) * k;
  const sp = Math.hypot(a.vx, a.vy);
  if (sp > vmax) { a.vx *= vmax/sp; a.vy *= vmax/sp; }
  a.x += a.vx; a.y += a.vy;
}

export function nurseBrain(w:World, ant:Ant){
  const A:any = ant;
  const Q = _q(w); if (!Q) return;

  const K = 0.006;                 // ~50% del worker
  const VMAX = 1.25;

  A.pulse = A.pulse ?? 0.9;
  A._pulseDir = A._pulseDir ?? -1;

  const eggs:any[] = (w as any).eggs ?? [];

  // --- nidos válidos (host!=queen, construidos, sin obreras) ---
  const canNest = (h:any)=> h.host!=="queen" && h.completed && ((h.occupancy ?? 0) === 0);
  const broodAll = w.hexes.filter(canNest) as any[];

  // Mantener hasta 4 nidos fijos (no se descartan por estar “llenos”)
  const eggsInHex = (hid:number)=> eggs.filter(e => e.state==="incubating" && (e as any).hexId===hid).length;
  const broodSorted = [...broodAll].sort((a,b)=> (eggsInHex(a.id) - eggsInHex(b.id)) || (a.id - b.id));
  A.nests = (A.nests ?? []).filter((id:number)=> broodAll.some(h => (h as any).id === id));
  for (const h of broodSorted){ if (A.nests.length>=4) break; if (!A.nests.includes(h.id)) A.nests.push(h.id); }
  const nests = (A.nests as number[]).map(id => broodAll.find(h=>h.id===id)).filter(Boolean) as any[];

  // ¿hay hueco para traer MÁS huevos? (alguno de MIS nidos con <6)
  const haveRoom = (A.nests as number[]).some((id:number)=> eggsInHex(id) < 6);

  const atQueen = eggs.find(e => e.state === "atQueen");

  /* ========= TRANSPORTE DE HUEVOS ========= */
  if (A.carryEggId != null){
    const egg = eggs.find(e => e.id === A.carryEggId);
    const nest = nests.find(n => eggsInHex(n.id) < 6) ?? nests[0];
    if (!egg || !nest) { A.carryEggId = null; return; }
    _approach(A, nest.cx, nest.cy, K, VMAX);
    if (_d2(A.x,A.y,nest.cx,nest.cy) < (nest.sidePx*nest.sidePx*0.12)){
      const born = (nest.eggs?.born ?? 0);
      const r = nest.sidePx * 0.72;
      const ang = Math.PI/6 + (born % 6) * (Math.PI/3);
      const px = nest.cx + Math.cos(ang)*r, py = nest.cy + Math.sin(ang)*r;

      nest.eggs = nest.eggs ?? { spots:[], born:0, active:true, fed:0 };
      nest.eggs.spots.push({ x:px, y:py });
      nest.eggs.born = born + 1;

      (egg as any).x = px; (egg as any).y = py;
      (egg as any).hexId = nest.id;
      egg.state = "incubating";
      egg.fed = 0;
      (egg as any).tStart = ((w as any)._tick ?? 0);
      (egg as any).hatchAt = undefined;
      (egg as any).carrierId = null;

      A.carryEggId = null;
    }
    return;
  }
  if (atQueen && haveRoom && (A.carryingUnits ?? 0) <= 0){
    _approach(A, Q.cx, Q.cy, K, VMAX);
    if (_d2(A.x,A.y,Q.cx,Q.cy) < (Q.sidePx*Q.sidePx*0.12)){
      A.carryEggId = atQueen.id; atQueen.state = "carried"; (atQueen as any).carrierId = A.id;
    }
    return;
  }

  /* ========= ALIMENTACIÓN ========= */
  // mantén el mismo huevo objetivo hasta llegar a 25
  let targetEgg:any = A.feedEggId != null ? eggs.find(e => e.id === A.feedEggId) : null;
  if (!targetEgg || targetEgg.state!=="incubating" || (targetEgg.fed ?? 0) >= NURSE_FEED_FULL || !(A.nests ?? []).includes((targetEgg as any).hexId)){
    targetEgg = eggs.find(e =>
      e.state === "incubating" &&
      (A.nests ?? []).includes((e as any).hexId) &&
      ((e.fed ?? 0) < NURSE_FEED_FULL)
    ) ?? null;
    A.feedEggId = targetEgg?.id ?? null;
  }

  if (targetEgg){
    // a) sin carga -> ir a queen a buscar 5 und
    if ((A.carryingUnits ?? 0) <= 0){
      _approach(A, Q.cx, Q.cy, K, VMAX);
      if (_d2(A.x,A.y,Q.cx,Q.cy) < (Q.sidePx*Q.sidePx*0.12)){
        const bank = (w as any).stockFood ?? 0;
        const take = Math.min(NURSE_FEED_STEP, bank);
        if (take > 0){ (w as any).stockFood = bank - take; A.carryingUnits = take; }
      }
      return;
    }
    // b) con carga -> ir al nido del huevo objetivo
    const nest = w.hexes.find(h => (h as any).id === (targetEgg as any).hexId) as any;
    if (nest){
      _approach(A, nest.cx, nest.cy, K, VMAX);
      if (_d2(A.x,A.y,nest.cx,nest.cy) < (nest.sidePx*nest.sidePx*0.12)){
        const give = Math.min(A.carryingUnits ?? 0, NURSE_FEED_STEP, NURSE_FEED_FULL - (targetEgg.fed ?? 0));
        if (give > 0){
          targetEgg.fed = (targetEgg.fed ?? 0) + give;
          (targetEgg as any)._feedFx = 10;   // halo verde para el render
          A.carryingUnits = (A.carryingUnits ?? 0) - give;

          // si llegó a 25, iniciar incubación (45 s = HATCH_TIME)
          if ((targetEgg.fed ?? 0) >= NURSE_FEED_FULL && (targetEgg as any).hatchAt == null){
            (targetEgg as any).hatchAt = (((w as any)._tick ?? 0) + HATCH_TIME);
          }
        }
      }
    }
    return;
  }

  /* ========= FALLBACK: SIN HUEVOS QUE ALIMENTAR PERO VA CARGADA ========= */
  if ((A.carryingUnits ?? 0) > 0){
    _approach(A, Q.cx, Q.cy, K, VMAX);
    if (_d2(A.x,A.y,Q.cx,Q.cy) < (Q.sidePx*Q.sidePx*0.12)){
      (w as any).stockFood = ((w as any).stockFood ?? 0) + (A.carryingUnits ?? 0);
      A.carryingUnits = 0; // queda libre para volver a recoger huevos cuando haya hueco
    }
    return;
  }

  /* ========= LATENCIA ========= */
  const idleTarget:any = (nests[0] ?? Q);
  _approach(A, idleTarget.cx, idleTarget.cy, K, VMAX);
  A.pulse += 0.02 * (A._pulseDir ?? -1);
  if (A.pulse < 0.3) { A.pulse = 0.3; A._pulseDir = 1; }
  else if (A.pulse > 1.0){ A.pulse = 1.0; A._pulseDir = -1; }
}
