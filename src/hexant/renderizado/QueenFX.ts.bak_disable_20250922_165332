import { Application, Container, Graphics, BLEND_MODES } from "pixi.js";
import type { World } from "../tipos";

/** Overlay de la reina: glow + render de huevos */
export class QueenFX {
  private app: Application;
  private layer: Container;
  private glow: Graphics;
  private eggsLayer: Container;
  private eggPool: Graphics[] = [];
  private eggUsed = 0;

  constructor(app: Application){
    this.app = app;
    this.layer = new Container();
    this.layer.zIndex = 50; // sobre la grilla y mundo
    this.app.stage.addChild(this.layer);

    this.glow = new Graphics();
    this.glow.blendMode = 1 as any; // ADD
    this.layer.addChild(this.glow);

    this.eggsLayer = new Container();
    this.layer.addChild(this.eggsLayer);
  }

  private getFromPool(pool: Graphics[], parent: Container, i: number){
    if (pool[i]) return pool[i];
    const g = new Graphics();
    parent.addChild(g);
    pool[i] = g;
    return g;
  }

  update(w:World){
    const t = (w as any)._tick ?? 0;

    // --- Reina ---
    const q = w.hexes.find(h => h.host === "queen");
    this.glow.clear();
    if (q){
      // Glow azul/violeta suave
      const pulse = 0.5 + 0.5*Math.sin(t*0.12);
      const r1 = 14 + 4*pulse;
      const r2 = 24 + 6*pulse;

      this.glow
        .circle(q.cx, q.cy, r2).fill(0x5726F4, 0.06).clear()
        .circle(q.cx, q.cy, r1).fill(0x43C8FF, 0.10).clear()
        .circle(q.cx, q.cy, 8 ).fill(0xA428FF, 0.12).clear();
    }

    // --- Huevos ---
    this.eggUsed = 0;
    const eggs = (w as any).eggs as any[] | undefined;
    if (q && eggs && eggs.length){
      // Colocación/órbita de los que están en la reina
      const atQueen = eggs.filter(e => e.state === "atQueen");
      const n = Math.max(1, atQueen.length);
      for (let i=0;i<atQueen.length;i++){
        const e = atQueen[i];
        const ang = (i / n) * Math.PI*2 + t*0.06; // órbita suave
        const R = 16; // radio del anillo
        e.x = q.cx + Math.cos(ang)*R;
        e.y = q.cy + Math.sin(ang)*R;
      }

      // Pintado (según estado)
      for (const e of eggs){
        const g = this.getFromPool(this.eggPool, this.eggsLayer, this.eggUsed++);
        g.clear();

        if (e.state === "atQueen"){
          g.circle(e.x, e.y, 3).fill(0xFFA53A, 1);   // naranja vivo
        } else if (e.state === "incubating"){
          g.circle(e.x, e.y, 3).fill(0xFF8E2B, 0.9); // naranja más tenue
        } else if (e.state === "carried"){
          g.circle(e.x, e.y, 2.6).fill(0xFFD08A, 0.95);
        }
      }
    }

    // Oculta sobrantes del pool
    for (let i=this.eggUsed;i<this.eggPool.length;i++){
      const g = this.eggPool[i];
      if (g) g.clear();
    }
  }

  destroy(){
    for (const g of this.eggPool) if (g) g.destroy();
    this.eggPool.length = 0;
    this.eggsLayer.destroy({ children: true });
    this.glow.destroy({ children: false });
    this.layer.destroy({ children: true });
  }
}

