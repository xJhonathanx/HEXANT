/**
 * Replica  aplica snapshots del servidor al mundo.
 * Aquí es un stub que simplemente reemplaza propiedades conocidas.
 */
import type { World } from "../../tipos";

export class Replica {
  applySnapshot(w:World, snap:any){
    // En producción: merge profundo, preservando referencias estables.
    if (!snap) return;
    if (typeof snap.stockFood === "number") w.stockFood = snap.stockFood;
    if (Array.isArray(snap.ants)) w.ants = snap.ants;
    if (Array.isArray(snap.hexes)) w.hexes = snap.hexes;
    if (Array.isArray(snap.food)) w.food = snap.food;
    if (Array.isArray(snap.beacons)) w.beacons = snap.beacons;
  }
}
