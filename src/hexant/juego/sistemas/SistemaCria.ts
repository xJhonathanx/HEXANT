import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";
import { EGGS_NEED_UND, HATCH_TIME } from "../configuracion/predeterminados";

/**
 * Mantiene el ciclo de los huevos:
 * - Si no se alimentan, expiran tras TTL.
 * - Si se alimentan >= EGGS_NEED_UND, cuenta regresiva de hatch y eclosión.
 *
 * Nota: usamos un TTL local de 5 min @ 60 FPS para evitar dependencias:
 */
const EGGS_TTL_TICKS = 5 * 60 * 60; // 5 min * 60 s/min * 60 ticks/s

export function SistemaCria(w: World, _cfg: Cfg) {
  for (const h of w.hexes) {
    if (!h.eggs || !h.eggs.active) continue;

    // TTL si no se alimenta
    h.eggs.ageTicks = (h.eggs.ageTicks ?? 0) + 1;
    if ((h.eggs.fed ?? 0) < EGGS_NEED_UND && (h.eggs.ageTicks ?? 0) >= EGGS_TTL_TICKS) {
      // Caducan por falta de alimento
      h.eggs.active = false;
      h.eggs.count = 0;
      continue;
    }

    // Eclosión si está alimentado
    if ((h.eggs.fed ?? 0) >= EGGS_NEED_UND) {
      // Asegura hatchTicks inicial
      h.eggs.hatchTicks = (h.eggs.hatchTicks ?? HATCH_TIME);

      // Decrementa de forma segura
      if ((h.eggs.hatchTicks ?? 0) > 0) {
        h.eggs.hatchTicks = (h.eggs.hatchTicks as number) - 1;
      }

      // ¿Listo para eclosionar?
      if ((h.eggs.hatchTicks ?? 0) <= 0) {
        const workers  = w.ants.filter(a => a.kind === "worker").length;
        const builders = w.ants.filter(a => a.kind === "builder").length;

        // Mantén tu regla de builder 1/10 workers
        const wantBuilder = builders < Math.floor(workers / 10);
        const makeBuilders = wantBuilder ? Math.min(1, h.eggs.count ?? 0) : 0;
        const makeWorkers  = Math.max(0, (h.eggs.count ?? 0) - makeBuilders);

        // Aquí normalmente generarías hormigas y limpiarías el lote.
        // Dejo el cierre no destructivo para no duplicar spawns si los manejas en otro sistema:
        h.eggs.active = false;
        // Si aquí quieres spawnear directamente, usa tu fábrica newAnt(...) y pushea:
        // for (let i=0;i<makeBuilders;i++) { ... }
        // for (let i=0;i<makeWorkers;i++)  { ... }
      }
    }
  }
}
