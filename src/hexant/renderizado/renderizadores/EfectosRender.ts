/**
 * EfectosRender.ts  placeholder para beacons/partículas.
 * De momento: dibuja un puntito translúcido.
 */
import { Graphics } from "pixi.js";

export function dibujarBeacon(g: Graphics, x:number, y:number){
  g.clear();
  g.circle(x, y, 2.5).fill(0x00ffc8, 0.18);
}
