// E:\GAME\HEXANTV1\src\hexant\renderizado\MotorDeRender.ts
import { Application, Container, Graphics, Text } from "pixi.js";
import type { World, Ant } from "../tipos";
import { drawAnt } from "./renderizadores/HormigaRender";

export class MotorDeRender {
  // === caches / pools ===
  private antMap = new Map<number, Graphics>(); // un gráfico por hormiga (persistente)

  private queenG: Graphics = new Graphics();
  private app: Application;

  private mundo = new Container();
  private layerHex = new Container();
  private layerFood = new Container();
  private layerHaz = new Container();
  private layerAnts = new Container();

  private fx = new Container();
  private hud = new Container();
  private hudLabel: Text;

  private hexPool: Graphics[] = [];    private hexUsed = 0;
  private foodPool: Graphics[] = [];   private foodUsed = 0;
  private hazardPool: Graphics[] = []; private hazardUsed = 0;
  private antPool: Graphics[] = [];    private antUsed = 0;

  private domeG: Graphics | null = null;

  constructor(app: Application) {
    this.app = app;

    this.mundo.addChild(this.layerHex, this.layerFood, this.layerHaz, this.layerAnts);
    this.app.stage.addChild(this.mundo, this.fx, this.hud);

    this.hudLabel = new Text({
      text: "",
      style: { fill: 0xbfd6d6, fontSize: 14, fontFamily: "monospace" }
    });
    this.hudLabel.x = 8; this.hudLabel.y = 6;
    this.hud.addChild(this.hudLabel);

    this.fx.zIndex = 2; this.mundo.zIndex = 1; this.hud.zIndex = 3;
    this.app.stage.sortChildren();
  }

  // ===== utils =====
  private getFromPool(pool: Graphics[], parent: Container, i: number): Graphics {
    if (!pool[i]) {
      const g = new Graphics();
      parent.addChild(g);
      pool[i] = g;
    }
    const g = pool[i];
    g.visible = true;
    return g.clear();
  }

  private hideRest(pool: Graphics[], used: number) {
    for (let i = used; i < pool.length; i++) {
      const g = pool[i];
      if (g) { g.clear(); g.visible = false; }
    }
  }


  // === Borde neón por segmentos (con progreso opcional) ===
private drawHexNeon(g: Graphics, pts: number[], width: number, progress?: number){
  const C1 = 0xA100FF; // magenta
  const C2 = 0x00F6FF; // cian

  const segsPerEdge = 10;        // segmentos por lado
  const total = segsPerEdge * 6; // 6 lados
  const cutoff = Math.max(0, Math.min(total, Math.round((progress ?? 1) * total)));

  let k = 0;
  for (let e = 0; e < 6; e++){
    const i0 = e * 2;
    const i1 = ((e + 1) % 6) * 2;
    const ax = pts[i0],     ay = pts[i0 + 1];
    const bx = pts[i1],     by = pts[i1 + 1];

    for (let s = 0; s < segsPerEdge; s++){
      if (k++ >= cutoff) return;
      const t0 = s / segsPerEdge, t1 = (s + 1) / segsPerEdge;
      const x0 = ax + (bx - ax) * t0, y0 = ay + (by - ay) * t0;
      const x1 = ax + (bx - ax) * t1, y1 = ay + (by - ay) * t1;

      const col = this._lerpColor(C1, C2, (e + t0) / 6); // degrada a lo largo del perímetro
      g.moveTo(x0, y0).lineTo(x1, y1)
       .stroke({ color: col, width, alpha: 0.95, alignment: 0.5 });
    }
  }
}

private _lerpColor(c1:number, c2:number, t:number){
  const r1=(c1>>16)&255, g1=(c1>>8)&255, b1=c1&255;
  const r2=(c2>>16)&255, g2=(c2>>8)&255, b2=c2&255;
  const r = Math.round(r1+(r2-r1)*t);
  const g = Math.round(g1+(g2-g1)*t);
  const b = Math.round(b1+(b2-b1)*t);
  return (r<<16)|(g<<8)|b;
}

  // ===== main render =====
  renderWorld(w: World) {
    this.hexUsed = this.foodUsed = this.hazardUsed = this.antUsed = 0;

    this.syncDome(w);
    this.syncHexes(w);
    this.syncFood(w);
    this.syncHazards(w);
    this.syncAnts(w);
    this.drawQueen(w);



    this.hideRest(this.hexPool, this.hexUsed);
    this.hideRest(this.foodPool, this.foodUsed);
    this.hideRest(this.hazardPool, this.hazardUsed);
    this.hideRest(this.antPool, this.antUsed);

    // HUD
    const workers = w.ants.filter((a: Ant) => a.kind === "worker").length;
    const builders = w.ants.filter((a: Ant) => a.kind === "builder").length;
    const soldiers = w.ants.filter((a: Ant) => a.kind === "soldier").length;
    const foods = w.food.filter((f: any) => (f.amount ?? 0) > 0).length;
    const hazards = w.hazards.length;
    const bank = Math.round((w as any).stockFood ?? 0);
    const eggsAtQueen = (w.eggs ?? []).filter((e: any) => e.state === "atQueen").length;
    this.hudLabel.text =
      `W:${workers}  B:${builders}  S:${soldiers} | Food:${foods} Haz:${hazards} | Banco:${bank} | Huevos:${eggsAtQueen}`;
  }

  // ===== dome =====
  private syncDome(w: World) {
    const q = w.hexes.find(h => (h as any).host === "queen");
    if (!q) return;

    if (!this.domeG) {
      this.domeG = new Graphics();
      this.fx.addChildAt(this.domeG, 0);
    }
    const r = (w as any).domeRadius ?? (w as any).smellRadius ?? ((q as any).sidePx * 6);
    this.domeG
      .clear()
      .circle((q as any).cx, (q as any).cy, r)
      .stroke({ color: 0x0aa3a3, width: 2, alpha: 0.55, alignment: 0.5 });
  }

  // ===== queen + eggs glow/orbit =====
  private drawQueen(w: World) {
    const q = w.hexes.find(h => (h as any).host === "queen");
    if (!q) { this.queenG.visible = false; return; }

    if (this.queenG.parent !== this.fx) this.fx.addChild(this.queenG);
    this.queenG.visible = true;
    this.queenG.clear();

    const R = 10;
    const cx = (q as any).cx, cy = (q as any).cy;

    // cuerpo
    this.queenG.circle(cx, cy, R).fill(0xfff1a8, 1.0);
    this.queenG.circle(cx, cy, R + 3).stroke({ color: 0xffe26a, width: 2, alpha: 0.7 });

    // huevos orbitando
    const eggs = (w.eggs ?? []).filter((e: any) => e.state === "atQueen");
    const t = (w as any)._tick ?? 0;
    const n = eggs.length;
    if (n > 0) {
      const ringR = R + 18;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + t * 0.05;
        const ex = cx + Math.cos(a) * ringR;
        const ey = cy + Math.sin(a) * ringR;
        this.queenG.circle(ex, ey, 3)
          .fill(0xffc14a, 0.95)
          .stroke({ color: 0xff9f2a, width: 1, alpha: 0.9 });
      }
    }
  }

  // ===== hexes (and egg spots inside hexes) =====
  private syncHexes(w: World) {
    for (const h of w.hexes) {
      const g = this.getFromPool(this.hexPool, this.layerHex, this.hexUsed++);
      const r = (h as any).sidePx;
      const cx = (h as any).cx;
      const cy = (h as any).cy;

     const pts: number[] = [];
for (let i = 0; i < 6; i++) {
  const a = Math.PI / 3 * i + Math.PI / 6;
  pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
}
this.drawHexNeon(g, pts, 3); 
// progreso de construcción: ilumina el contorno según built/target
const built = (h as any).builtUnits ?? 0;
const target = (h as any).targetUnits ?? 0;
const done = !!(h as any).completed;
if (!done && target > 0 && built > 0) {
  // vértices como pares {x,y}
  const verts: Array<{x:number,y:number}> = [];
  for (let i=0;i<6;i++){
    const a = Math.PI/3*i + Math.PI/6;
    verts.push({ x: cx + r*Math.cos(a), y: cy + r*Math.sin(a) });
  }
  const total = Math.min(1, built / target) * 6;
  const full = Math.floor(total);
  const partial = total - full;

  // empieza en el primer vértice
  g.moveTo(verts[0].x, verts[0].y);
  for (let i=1; i<=full; i++){
    const v = verts[i % 6];
    g.lineTo(v.x, v.y);
  }
  if (partial > 0){
    const a = verts[full % 6];
    const b = verts[(full + 1) % 6];
    const px = a.x + (b.x - a.x) * partial;
    const py = a.y + (b.y - a.y) * partial;
    g.lineTo(px, py);
  }
  g.stroke({ color: 0xff3abf, width: 4, alpha: 0.95 });
}
      // huevos "colocados" en el hex (spots + born)
      const born = (h as any).eggs?.born ?? 0;
      const spots = (h as any).eggs?.spots as Array<{ x: number, y: number }> | undefined;
      if (spots && born > 0) {
        const count = Math.min(born, spots.length);
        for (let i = 0; i < count; i++) {
          const p = spots[i];
          this.getFromPool(this.foodPool, this.fx, this.foodUsed++)
            .circle(p.x, p.y, 3)
            .fill(0xffa652, 1);
        }
      }
    }
  }

  // ===== food =====
  private syncFood(w: World) {
    for (const f of w.food) {
      if ((f as any).amount <= 0) continue;
      this.getFromPool(this.foodPool, this.layerFood, this.foodUsed++)
        .circle((f as any).x, (f as any).y, 5)
        .fill(0x6cf9ff, 1);
    }
  }

  // ===== hazards =====
  private syncHazards(w: World) {
    for (const hz of w.hazards) {
      this.getFromPool(this.hazardPool, this.layerHaz, this.hazardUsed++)
        .circle((hz as any).x, (hz as any).y, 10)
        .fill(0xff4b46, 0.9);
    }
  }

  // ===== ants =====
  private syncAnts(w: World) {
    const aliveIds = new Set<number>();

    for (const a of (w.ants as any[])) {
      const id = (a as any).id as number;
      if (id == null) continue;
      aliveIds.add(id);

      let g = this.antMap.get(id);
      if (!g) {
        g = new Graphics();
        this.mundo.addChild(g);
        this.antMap.set(id, g);
      }

      g.x = (a as any).x ?? 0;
      g.y = (a as any).y ?? 0;
      drawAnt(g, a as any);
      g.visible = true;
    }

    // limpiar hormigas que ya no existen
    for (const [id, g] of this.antMap) {
      if (!aliveIds.has(id)) {
        g.destroy();
        this.antMap.delete(id);
      }
    }
  }
}

