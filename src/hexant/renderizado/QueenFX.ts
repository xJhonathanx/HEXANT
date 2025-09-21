import { Application, Container, Graphics } from "pixi.js";
import type { World } from "../tipos";

/** Capa de FX para la reina: halo brillante + huevos visibles en su hex. */
export class QueenFX {
  private app: Application;
  private root: Container;
  private glow: Graphics;
  private eggs: Graphics;

  constructor(app:Application){
    this.app = app;
    this.root = new Container();
    this.root.zIndex = 50; // sobre la grilla, bajo el HUD
    this.app.stage.addChild(this.root);

    this.glow = new Graphics();
    this.glow.blendMode = "add";
    this.root.addChild(this.glow);

    this.eggs = new Graphics();
    this.root.addChild(this.eggs);

    this.app.stage.sortChildren();
  }

  update(w:World){
    const t = ((w as any)._tick ?? 0);
    const q = w.hexes.find(h=>h.host==="queen");
    this.glow.clear();
    this.eggs.clear();

    if (!q) return;

    // --- Halo pulsante (estilo "portal") ---
    const p1 = 0.6 + 0.4 * Math.sin(t*0.09);
    const p2 = 0.6 + 0.4 * Math.sin(t*0.13 + 1.2);
    const r1 = q.sidePx * (0.95 + 0.02*Math.sin(t*0.05));
    const r2 = q.sidePx * 0.62;
    const r3 = q.sidePx * 0.38;

    this.glow
      .circle(q.cx, q.cy, r1).stroke({ width: 2, color: 0x46e6ff, alpha: 0.25 })
      .circle(q.cx, q.cy, r2).fill(0x7a38ff, 0.20 * p1)
      .circle(q.cx, q.cy, r3).fill(0x68f6ff, 0.26 * p2);

    // --- Huevos "colocados" en spots del hex ---
    const born = q.eggs?.born ?? 0;
    const spots = q.eggs?.spots ?? [];
    for (let i=0; i<born && i<spots.length; i++){
      const p = spots[i];
      this.eggs.circle(p.x, p.y, 3).fill(0xffa64a, 1);
    }
  }

  destroy(){
    this.glow.destroy();
    this.eggs.destroy();
    this.root.destroy({ children: true });
  }
}



