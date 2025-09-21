import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

const RND = (n:number)=> (Math.random()*n)-(n/2);

export function SistemaScout(w:World, _cfg:Cfg){
  const W:any = w as any;
  const ants:any[] = w.ants as any[];

  // radio del domo cacheado
  if (W._domoR == null){
    const q = w.hexes.find((h:any)=>h.host==="queen");
    W._domoR = q ? q.sidePx*6.2 : Math.min((W.width||1200),(W.height||800))*0.35;
  }

  // seed: 1 scout + 1 kel (una sola vez)
  if (!W._scoutSeeded){
    const q = w.hexes.find((h:any)=>h.host==="queen");
    const cx = q?.cx ?? (W.width*0.5), cy = q?.cy ?? (W.height*0.5);
    ants.push({ id:w.nextAntId++, kind:"scout", x:cx+40, y:cy, vx:0, vy:0, state:"scouting" } as any);
    ants.push({ id:w.nextAntId++, kind:"kel",   x:cx+10, y:cy, vx:0, vy:0, state:"escort" } as any);
    W._scoutSeeded = true;
  }

  const scout = ants.find(a=>a.kind==="scout");
  const kel   = ants.find(a=>a.kind==="kel");
  if (!scout || !kel) return;

  // velocidad con bonificación si están cerca
  const dPair = Math.hypot(kel.x - scout.x, kel.y - scout.y);
  const speed = dPair < 24 ? 2.0 : 1.0;

  // deambular del scout (tendencia a salir del domo)
  const q = w.hexes.find((h:any)=>h.host==="queen");
  if (q){
    const dx = scout.x - q.cx, dy = scout.y - q.cy;
    const r = Math.hypot(dx,dy);
    if (r < W._domoR + 30){
      scout.vx += (dx/(r||1))*0.3 + RND(0.2);
      scout.vy += (dy/(r||1))*0.3 + RND(0.2);
    } else {
      scout.vx += RND(0.3);
      scout.vy += RND(0.3);
    }
  }
  scout.vx *= 0.96; scout.vy *= 0.96;
  scout.x  += scout.vx * speed; scout.y += scout.vy * speed;

  // kel orbita al scout; si está en modo mensajero, va a la reina
  const messenger = !!(W.meta?.scoutVigilia && (W.meta as any).kelIsMessenger);
  if (!messenger){
    const ang = (W._tick||0)*0.05;
    const R   = 18 * (W.meta?.scoutVigilia ? 3 : 1);
    const tx = scout.x + Math.cos(ang)*R;
    const ty = scout.y + Math.sin(ang)*R;
    kel.x += (tx - kel.x)*0.2;
    kel.y += (ty - kel.y)*0.2;
  } else if (q){
    kel.x += (q.cx - kel.x)*0.08;
    kel.y += (q.cy - kel.y)*0.08;
    if (Math.hypot(kel.x-q.cx, kel.y-q.cy) < 18){
      (W.meta as any).kelIsMessenger = false; // llegó
    }
  }

  // ¿hay comida fuera del domo?
  const hasOutsideFood = q
    ? w.food.some((f:any)=> f.amount>0 && Math.hypot(f.x-q.cx,f.y-q.cy) > W._domoR+10)
    : false;

  W.meta = W.meta ?? {};
  if (hasOutsideFood){
    (W.meta as any).scoutVigilia   = true;
    (W.meta as any).umbilicalActive= true;
    (W.meta as any).umbilicalX     = scout.x;
    (W.meta as any).umbilicalY     = scout.y;
    (W.meta as any).kelIsMessenger = true; // kel va a avisar
  } else {
    (W.meta as any).scoutVigilia   = false;
    (W.meta as any).umbilicalActive= false;
  }
}
