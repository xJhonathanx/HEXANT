import type { Application } from "pixi.js";
import type { World } from "../tipos";

/**
 * OverlayScout (legacy) deshabilitado.
 * Dibujaba grilla + scout/kel en coordenadas de PANTALLA (no seguía la cámara) y quedaba
 * tapado por el fondo del mundo, así que no se veía pero se recalculaba cada tick.
 * La grilla, el scout, el kel y el umbilical se renderizan en MotorDeRender en coords de mundo.
 */
export class OverlayScout {
  constructor(_app: Application) { /* noop */ }
  update(_w: World) { /* noop */ }
  destroy() { /* noop */ }
}
