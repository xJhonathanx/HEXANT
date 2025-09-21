import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

import { SistemaSemilla } from "./SistemaSemilla";
import { SistemaReina } from "./SistemaReina";
import { SistemaIA } from "./SistemaIA";
import { SistemaMetabolismo } from "./SistemaMetabolismo";

import { SistemaPlanificacion } from "./SistemaPlanificacion";
import { SistemaBuilder } from "./SistemaBuilder";

export function ejecutarSistemas(w: World, cfg: Cfg) {
  (w as any)._tick = ((w as any)._tick ?? 0) + 1;

  // 1) Semilla (3 obreras + 1 constructora)
  SistemaSemilla(w, cfg);

  // 2) Reina (pone huevos y cobra del banco)
  SistemaReina(w, cfg);

  // 3) Planificar nuevo hex si hay 6 huevos en la reina y una constructora
  SistemaPlanificacion(w, cfg);

  // 4) Construcción: la constructora avanza el hex objetivo consumiendo banco
  SistemaBuilder(w, cfg);

  // 5) IA de hormigas (forrajeo, etc.)
  if (typeof SistemaIA === "function") SistemaIA(w, cfg);

  // 6) Metabolismo, etc.
  if (typeof SistemaMetabolismo === "function") SistemaMetabolismo(w, cfg);
}
