import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

import { SistemaSemilla } from "./SistemaSemilla";
import { SistemaReina } from "./SistemaReina";
import { SistemaIA } from "./SistemaIA";
import { SistemaHuevos } from "./SistemaHuevos";
import { SistemaPlanificacion } from "./SistemaPlanificacion"; // si lo usas para crear hex objetivo

export function ejecutarSistemas(w:World, cfg:Cfg){
  (w as any)._tick = ((w as any)._tick ?? 0) + 1;

  // 1) Siembra inicial (1 constructora + 3 obreras)
  SistemaSemilla(w, cfg);

  // 2) Reina pone huevos-entity (cobra del banco), tope 6 en su hex
  SistemaReina(w, cfg);

  // 3) Traslado 1x1 por constructora + espejo para render
  SistemaHuevos(w, cfg);

  // 4) IA de obreras (forrajeo / depósito)
  SistemaIA(w, cfg);

  // 5) Planificación del hex objetivo (si cumples tu condición de 6 huevitos listos)
  if (typeof SistemaPlanificacion === "function"){
    SistemaPlanificacion(w, cfg);
  }
}
