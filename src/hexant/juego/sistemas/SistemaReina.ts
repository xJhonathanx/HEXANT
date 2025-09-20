import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

export function SistemaReina(w:World, _cfg:Cfg){
  const q = w.hexes.find(h=>h.host==="queen");
  if (!q) return;

  (w as any).meta = (w as any).meta ?? {
    broodEggsStaged: 0,
    broodTargetHexId: null,
    broodTransferPending: false,
    eggCooldown: 0,
    buildCooldownTicks: 0,
  };
  const m:any = w.meta;

  // Nido de comida (home:true)
  let nest = (w.food as any[]).find(f=>f.home);
  if (!nest){
    nest = { x:q.cx, y:q.cy, amount:0, initial:0, home:true };
    w.food.push(nest);
  }

  // Poner huevos pagando comida
  const EGG_COST = 5;
  if (m.eggCooldown>0) m.eggCooldown--;
  if (nest.amount >= EGG_COST && m.broodEggsStaged < 6 && !m.broodTransferPending && m.eggCooldown===0){
    nest.amount -= EGG_COST;
    m.broodEggsStaged++;
    m.eggCooldown = 20;
  }
}
