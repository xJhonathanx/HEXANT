import type { Application } from "pixi.js";
import type { World } from "../tipos";

/**
 * QueenFX (legacy) deshabilitado.
 * La reina, huevos orbitando e incubando se renderizan ahora en MotorDeRender
 * (layerTop / fxWorld) y por lo tanto siguen la cámara correctamente.
 */
export class QueenFX {
  constructor(_app: Application) { /* noop */ }
  update(_w: World) { /* noop */ }
  destroy() { /* noop */ }
}
