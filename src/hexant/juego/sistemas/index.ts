import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

import { SistemaSemilla } from "./SistemaSemilla";
import { SistemaReina } from "./SistemaReina";
import { SistemaIA } from "./SistemaIA";
import { SistemaMetabolismo } from "./SistemaMetabolismo";

import { SistemaPlanificacion } from "./SistemaPlanificacion";
import { SistemaBuilder } from "./SistemaBuilder";
import { SistemaInfluencia } from "./SistemaInfluencia";
import { SistemaEclosion } from "./SistemaEclosion"; // ← eclosión
import { SistemaGuito } from "./SistemaGuito";

export function ejecutarSistemas(w: World, cfg: Cfg) {
  (w as any)._tick = ((w as any)._tick ?? 0) + 1;

  // 1) seed
  SistemaSemilla(w, cfg);

  // 1.1) salvage: si por cualquier motivo no hay nurse, crea una junto a la reina
  {
    const hasNurse = w.ants.some((a:any) => a.kind === "nurse");
    const q = w.hexes.find(h => (h as any).host === "queen") as any;
    if (!hasNurse && q) {
      w.ants.push({
        id: w.nextAntId++,
        kind: "nurse" as any,
        x: q.cx, y: q.cy, vx: 0, vy: 0,
        carryingUnits: 0, state: "foraging", homeHexId: q.id,
      } as any);
    }
  }


  // 2) reina (postura y banco)
  SistemaReina(w, cfg);

  // 3) planificación de hex (con tu gate de huevos eclosionados)
  SistemaPlanificacion(w, cfg);

  // 4) AIR (radio dinámico y correa)
  SistemaInfluencia(w, 0);

  // 5) IA (workers, builder, nurse) — la nurse se maneja en nurseBrain
  if (typeof SistemaIA === "function") SistemaIA(w, cfg);

  // 6) builder consume banco y avanza la obra
  SistemaBuilder(w, cfg);

  // 7) eclosión: (fed>=25) && (tick>=hatchAt)
  SistemaEclosion(w, cfg);

  // 8) metabolismo
  if (typeof SistemaMetabolismo === "function") SistemaMetabolismo(w, cfg);


  // 9) guito (produce comida)
  SistemaGuito(w);
if (typeof SistemaIA === "function") SistemaIA(w, cfg);
  if (typeof SistemaMetabolismo === "function") SistemaMetabolismo(w, cfg);

}
