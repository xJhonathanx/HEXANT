import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

/**
 * Traslado 1x1 por la constructora y espejo de conteos para render.
 * - Si hay meta.broodTransferPending + broodTargetHexId: la constructora
 *   recoge 1 huevo del hex de la reina (state:"atQueen"), lo carga (state:"carried"),
 *   y lo deja en el hex objetivo (state:"incubating").
 * - Mientras va "carried", el huevo viaja pegado a la hormiga.
 * - Se refleja h.eggs.born por hex para que el renderer actual siga mostrando puntos naranjas.
 */
export function SistemaHuevos(w:World, _cfg:Cfg){
  const tick = ((w as any)._tick ?? 0);

  // Asegurar estructura
  (w as any).eggs     = (w as any).eggs ?? [];
  (w as any).nextEggId= (w as any).nextEggId ?? 1;

  const queen = w.hexes.find(h=>h.host==="queen");
  const builder = w.ants.find(a=>a.kind==="builder");
  if (!queen) return;

  // Sincronizar huevos "carried": van pegados a la constructora que los lleva
  for(const e of (w.eggs as any[])){
    if (e.carriedBy != null){
      const a = w.ants.find(x=>x.id===e.carriedBy);
      if (a){ e.x = a.x; e.y = a.y; }
      else { e.carriedBy = undefined; e.state = "atQueen"; e.hexId = queen.id; }
    }
  }

  // Lógica de traslado 1x1
  const m = w.meta as any;
  if (m?.broodTransferPending && m?.broodTargetHexId && builder){
    const target = w.hexes.find(h=>h.id===m.broodTargetHexId);
    if (target){
      const carrying = (w.eggs as any[]).find(e=>e.carriedBy===builder.id);
      if (!carrying){
        // Ir a la reina
        approach(builder, queen.cx, queen.cy, 0.06);
        // Si estamos cerca, tomar 1 huevo "atQueen"
        const close2 = dist2(builder.x-queen.cx, builder.y-queen.cy);
        const pick = (w.eggs as any[]).find(e=>e.state==="atQueen");
        if (pick && close2 < queen.sidePx*queen.sidePx*0.25){
          pick.carriedBy = builder.id;
          pick.state = "carried";
          pick.hexId = null;
        }
      }else{
        // Llevar al hex objetivo
        approach(builder, target.cx, target.cy, 0.06);
        const close2 = dist2(builder.x-target.cx, builder.y-target.cy);
        if (close2 < target.sidePx*target.sidePx*0.25){
          carrying.carriedBy = undefined;
          carrying.state = "incubating";
          carrying.hexId = target.id;
        }
      }

      // Si ya hay 6 incubando en destino -> fin de traslado
      const delivered = (w.eggs as any[]).filter(e=>e.hexId===target.id && e.state==="incubating").length;
      if (delivered >= 6){
        m.broodTransferPending = false;
        m.broodTargetHexId = null;
      }
    }
  }

  // Espejo: reset born por hex y acumular según w.eggs
  for(const h of w.hexes){
    if (!(h as any).eggs) (h as any).eggs = { born:0, fed:0, active:true, spots:[] };
    (h as any).eggs.born = 0;
  }
  for(const e of (w.eggs as any[])){
    const hid = (e.state==="atQueen" ? queen.id : e.hexId);
    const hex = w.hexes.find(h=>h.id===hid);
    if (hex){
      if (!(hex as any).eggs) (hex as any).eggs = { born:0, fed:0, active:true, spots:[] };
      (hex as any).eggs.born = ((hex as any).eggs.born ?? 0) + 1;
    }
  }
}

function dist2(dx:number, dy:number){ return dx*dx + dy*dy; }
function approach(a:any, tx:number, ty:number, k=0.05){
  a.vx = (a.vx ?? 0) + (tx - a.x) * k;
  a.vy = (a.vy ?? 0) + (ty - a.y) * k;
  a.x += a.vx; a.y += a.vy;
  a.vx *= 0.86; a.vy *= 0.86;
}

