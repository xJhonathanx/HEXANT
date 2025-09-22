import type { World } from "../../tipos";

/**
 * SistemaNurse — no-op.
 * La lógica de Nurse (traslado, 4 nidos, feed 5/25, latencia) vive en Cerebros.nurseBrain
 * y se invoca desde SistemaIA. Esto evita duplicar movimientos/feeds.
 */
export function SistemaNurse(_w: World, _cfg?: unknown) {
  /* no-op */
}
