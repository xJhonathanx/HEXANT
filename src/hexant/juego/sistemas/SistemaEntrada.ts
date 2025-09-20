/**
 * SistemaEntrada  helpers que invoca la UI (Aplicacion.tsx).
 * Click derecho: comida (10). Shift: patrón. Ctrl: peligro.
 */
import type { World } from "../../tipos";
import { stampFoodPattern } from "../contenido/Patrones";

export function placeFood(w:World, x:number, y:number, amount=10){
  w.food.push({ x, y, amount, initial: amount });
}
export function placePattern(w:World, x:number, y:number){
  stampFoodPattern(w, x, y, { kind:"random", cellSize:24, amountPerCell:10 });
}
export function placeHazard(w:World, x:number, y:number){
  w.hazards.push({
    x, y, r: 12, hp: 100,
    vx: (Math.random()*0.6-0.3),
    vy: (Math.random()*0.6-0.3)
  });
}
