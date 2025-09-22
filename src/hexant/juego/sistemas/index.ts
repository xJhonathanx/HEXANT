import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

import { SistemaSemilla } from "./SistemaSemilla";
import { SistemaReina } from "./SistemaReina";
import { SistemaIA } from "./SistemaIA";
import { SistemaMetabolismo } from "./SistemaMetabolismo";

import { SistemaPlanificacion } from "./SistemaPlanificacion";
import { SistemaBuilder } from "./SistemaBuilder";
import { SistemaNurse } from "./SistemaNurse";
import { SistemaEclosion } from "./SistemaEclosion";
import { SistemaHuevosCarry } from "./SistemaHuevosCarry";

export function ejecutarSistemas(w: World, cfg: Cfg) {
  (w as any)._tick = ((w as any)._tick ?? 0) + 1;

  // 1) Semilla (3 obreras + 1 constructora + 1 nurse si falta)
  SistemaSemilla(w, cfg);

  // 2) Reina (pone huevos y cobra del banco)
  SistemaReina(w, cfg);

  // 3) Planificar nuevo hex si hay 6 huevos en la reina y una constructora
  SistemaPlanificacion(w, cfg);

  // 3.5) Huevos en traslado pegados a su carrier (nurse)
  SistemaHuevosCarry(w);

  // 4) Nurse (no-op si delegada al cerebro)
  SistemaNurse(w, cfg);

  // 5) Construcción: la constructora avanza el hex objetivo consumiendo banco
  SistemaBuilder(w, cfg);

  // 6) IA (workers/builder/nurse brains)
  if (typeof SistemaIA === "function") SistemaIA(w, cfg);

  // 7) Eclosión: 45s tras llegar + fed>=25
  SistemaEclosion(w, cfg);

  // 8) Metabolismo, etc.
  if (typeof SistemaMetabolismo === "function") SistemaMetabolismo(w, cfg);
}
