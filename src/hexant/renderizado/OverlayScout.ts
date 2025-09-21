import { Application, Container, Graphics } from "pixi.js";
import type { World } from "../tipos";
import { axialToPixelPT } from "../utilidades/hex";

export class OverlayScout {
  private app: Application;
  private layer: Container;
  private grid: Graphics;
  private fx: Graphics;
  private scoutG: Graphics;
  private kelG: Graphics;
  private umb: Graphics;
  private tail: Array<{x:number,y:number}> = [];
  private kelTail: Array<{x:number,y:number}> = [];
  private angle = 0;

  constructor(app: Application){
    this.app = app;
    this.layer = new Container();
    this.layer.zIndex = 0;

    this.grid = new Graphics();
    this.fx = new Graphics();
    this.scoutG = new Graphics();
    this.kelG = new Graphics();
    this.umb = new Graphics();

    this.layer.addChild(this.grid);
    this.layer.addChild(this.umb);
    this.layer.addChild(this.fx);
    this.layer.addChild(this.scoutG);
    this.layer.addChild(this.kelG);
    this.app.stage.addChild(this.layer);
    this.app.stage.sortChildren();
  }

  private drawGrid(w: World){
    const qh = w.hexes.find(h => h.host === "queen");
    if (!qh){ this.grid.clear(); return; }

    const S = qh.sidePx;
    const W = this.app.renderer.width;
    const H = this.app.renderer.height;
    const rings = Math.ceil(Math.hypot(W, H) / (S * 1.5));

    this.grid.clear();

    const ang0 = Math.PI/6;
    for (let r = -rings; r <= rings; r++){
      for (let q = -rings; q <= rings; q++){
        const { x, y } = axialToPixelPT(q, r, S);
        const cx = qh.cx + x;
        const cy = qh.cy + y;
        if (cx < -S || cx > W + S || cy < -S || cy > H + S) continue;

        this.grid.moveTo(cx + S*Math.cos(ang0), cy + S*Math.sin(ang0));
        for (let i=1;i<6;i++){
          const a = ang0 + i*(Math.PI/3);
          this.grid.lineTo(cx + S*Math.cos(a), cy + S*Math.sin(a));
        }
        this.grid.closePath().stroke({ color: 0x0aa0a8, alpha: 0.35, width: 2 });
      }
    }
  }

  private drawScout(w: World){
    const qh = w.hexes.find(h => h.host === "queen");
    if (!qh){ this.scoutG.clear(); this.kelG.clear(); this.fx.clear(); this.umb.clear(); return; }

    const cx = qh.cx, cy = qh.cy;
    const S  = qh.sidePx;

    // Radio del domo (círculo visible)
    const R = (w as any).domeRadiusPx ?? (w as any).senseRadiusPx
           ?? Math.min(this.app.renderer.width, this.app.renderer.height) * 0.27;

    // Scout orbita a ~diámetro del domo (2R), con "respiración" leve
    const breath = 0.04 * R * Math.sin(this.angle * 0.6);
    const orbitR = Math.max(R + S * 0.5, 2 * R + breath);

    this.angle += 0.01;

    const ux = Math.cos(this.angle);
    const uy = Math.sin(this.angle);

    // Borde del domo para el umbilical
    const rimX = cx + ux * R;
    const rimY = cy + uy * R;

    // Posición del scout
    const sx = cx + ux * orbitR;
    const sy = cy + uy * orbitR;

    // === KEL: órbita helicoidal alrededor del scout ===
    // Proyección 2D de una hélice: ángulo más rápido + radio que "respira"
    const kelAng   = this.angle * 2.6;              // gira más rápido
    const kelPhase = this.angle * 1.5;             // fase para respirar
    const kelBaseR = S * 1.2;
    const kelAmpR  = S * 0.1;
    const kelR     = kelBaseR + kelAmpR * (0.1 + 0.1 * Math.sin(kelPhase)); // radio variable

    // Profundidad aparente (tamaño/alpha) para dar sensación 3D
    const depth    = 0.5 + 0.5 * Math.cos(kelAng);  // 0..1
    const kelSize  = 3 + 2 * depth;
    const kelAlpha = 0.6 + 0.4 * depth;

    const kx = sx + Math.cos(kelAng) * kelR;
    const ky = sy + Math.sin(kelAng) * kelR;

    // Colas
    this.tail.push({x:sx, y:sy}); if (this.tail.length > 18) this.tail.shift();
    this.kelTail.push({x:kx, y:ky}); if (this.kelTail.length > 14) this.kelTail.shift();

    this.fx.clear();
    for (let i=0;i<this.tail.length;i++){
      const t = this.tail[i]; const a = i/this.tail.length;
      this.fx.circle(t.x, t.y, 3).fill(0x59f7ff, 0.18 + 0.6*a);
    }
    for (let i=0;i<this.kelTail.length;i++){
      const t = this.kelTail[i]; const a = i/this.kelTail.length;
      this.fx.circle(t.x, t.y, 2).fill(0xffd659, 0.14 + 0.55*a);
    }

    // UMBILICAL más visible
    this.umb.clear();
    this.umb.moveTo(rimX, rimY).lineTo(sx, sy);
    this.umb.stroke({ color: 0x19c7d4, width: 3, alpha: 0.85 });

    // Cuerpos
    this.scoutG.clear().circle(sx, sy, 5).fill(0x59f7ff, 1);
    this.kelG.clear().circle(kx, ky, kelSize).fill(0xffd659, kelAlpha);
  }

  update(w: World){
    this.drawGrid(w);
    this.drawScout(w);
  }

  destroy(){
    this.grid.destroy();
    this.fx.destroy();
    this.scoutG.destroy();
    this.kelG.destroy();
    this.umb.destroy();
    this.layer.destroy({ children: true });
  }
}
