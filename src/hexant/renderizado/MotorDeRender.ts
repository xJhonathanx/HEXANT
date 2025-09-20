import { Application, Container, Graphics, Text } from "pixi.js";
import type { World, Hex, Ant } from "../tipos";
import { INFLUENCE_BASE_PX, INFLUENCE_PER_HEX_PX } from "../juego/configuracion/predeterminados";

/** Colores básicos */
const COL = {
  queen:   0xff2bd6,
  builder: 0xff9e66,
  soldier: 0xffe25a,
  worker:  0xff4a9e,
  food:    0x00e0ff,
  hazard:  0xff5b5b,
  beacon:  0x00ffc8,
  hud:     0xa3a3a3,
};

function hexVerts(cx:number, cy:number, side:number){
  const out:{x:number;y:number}[] = [];
  for(let i=0;i<6;i++){
    const a = (Math.PI/180) * (60*i - 30);
    out.push({ x: cx + side*Math.cos(a), y: cy + side*Math.sin(a) });
  }
  return out;
}

function queenHex(w:World){ return w.hexes.find(h=>h.host==="queen") ?? null; }
function influenceRadius(w:World){
  const n = w.hexes.filter(h=>h.host!=="queen").length;
  return INFLUENCE_BASE_PX + n * INFLUENCE_PER_HEX_PX;
}

export class MotorDeRender {
  private queenAura?: Graphics;
  private queenEggDots: Graphics[] = [];
  app: Application;

  mundo: Container;
  fx: Container;
  hud: Container;

  hudLabel: Text;

  influenceG: Graphics;
  queenGlow: Graphics;

  hexMap = new Map<number, Graphics>();
  antMap = new Map<number, Graphics>();

  foodPool: Graphics[] = [];  private foodUsed = 0;
  hazardPool: Graphics[] = []; private hazardUsed = 0;
  beaconPool: Graphics[] = []; private beaconUsed = 0;

  constructor(app: Application){
    this.app = app;
    this.app.stage.sortableChildren = true;

    this.mundo = new Container(); this.mundo.zIndex = 1;
    this.fx    = new Container(); this.fx.zIndex    = 2;
    this.hud   = new Container(); this.hud.zIndex   = 3;

    this.influenceG = new Graphics();
    this.queenGlow  = new Graphics();
    this.fx.addChild(this.influenceG, this.queenGlow);

    this.hudLabel = new Text({ text: "", style: { fill: COL.hud, fontSize: 12 } });
    this.hudLabel.position.set(8,8);
    this.hud.addChild(this.hudLabel);

    this.app.stage.addChild(this.mundo, this.fx, this.hud);
  }

  private getFromPool(pool:Graphics[], container:Container, i:number){
    if (pool[i]) { pool[i].visible = true; return pool[i]; }
    const g = new Graphics(); pool[i] = g; container.addChild(g); return g;
  }

  private syncInfluence(w:World){
    const q = queenHex(w);
    this.influenceG.clear();
    this.queenGlow.clear();
    if (!q) return;
    const R = influenceRadius(w);

    // aro de influencia
    this.influenceG.circle(q.cx, q.cy, R).stroke({ width: 1.5, color: 0x007a88, alpha: 0.35 });

    // brillo de la reina
    this.queenGlow.circle(q.cx, q.cy, q.sidePx*0.55).fill(0xff2bd6, 0.35);
    this.queenGlow.circle(q.cx, q.cy, q.sidePx*0.30).fill(0x00eaff, 0.55);
  }

  private drawHex(g:Graphics, h:Hex){
    g.clear();
    const color =
      h.host==="queen"   ? COL.queen   :
      h.host==="builder" ? COL.builder :
      h.host==="soldier" ? COL.soldier : COL.worker;

    const v = hexVerts(h.cx, h.cy, h.sidePx);
    g.moveTo(v[0].x, v[0].y);
    for (let i=1;i<6;i++) g.lineTo(v[i].x, v[i].y);
    g.closePath();
    g.stroke({ width: 3, color, alpha: 1 });

    // progreso de construcción (si aplica)
    if (h.targetUnits>0 && !h.completed){
      const totalPx = 6*h.sidePx;
      let leftPx = Math.min(h.builtUnits*10, totalPx);
      const w2 = 2; g.stroke({ width: w2, color: 0xff4a2a, alpha: 1 });
      for(let i=0;i<6;i++){
        const a=v[i], b=v[(i+1)%6];
        const segLen = Math.hypot(b.x-a.x, b.y-a.y);
        const take = Math.min(leftPx, segLen);
        if (take>0){
          const t = take/segLen;
          const px = a.x + (b.x-a.x)*t;
          const py = a.y + (b.y-a.y)*t;
          g.moveTo(a.x, a.y); g.lineTo(px, py);
          leftPx -= take;
        }
      }
      g.stroke({ width: 3, color, alpha: 1 }); // restaurar estilo
    }
  }

  private syncHexes(w:World){
    const seen = new Set<number>();
    for (const h of w.hexes){
      let g = this.hexMap.get(h.id);
      if (!g){ g = new Graphics(); this.hexMap.set(h.id, g); this.mundo.addChild(g); }
      this.drawHex(g, h);
      seen.add(h.id);
    }
    // limpiar los que ya no existen
    for (const [id,g] of this.hexMap){
      if (!seen.has(id)){ g.destroy(); this.hexMap.delete(id); }
    }
  }

  private syncAnts(w:World){
    const seen = new Set<number>();
    for (const a of w.ants){
      let g = this.antMap.get(a.id);
      if (!g){ g = new Graphics(); this.antMap.set(a.id, g); this.mundo.addChild(g); }
      g.clear();
      const r = a.kind==="soldier" ? 4 : a.kind==="builder" ? 3.6 : 3.1;
      const c =
        a.kind==="soldier" ? COL.soldier :
        a.kind==="builder" ? COL.builder :
        a.state==="waiting" ? 0xffe08a :
        a.carryingUnits>0 ? 0xbdfcc9 : 0x59f79b;
      g.circle(a.x, a.y, r).fill(c, 1);
      seen.add(a.id);
    }
    for (const [id,g] of this.antMap){
      if (!seen.has(id)){ g.destroy(); this.antMap.delete(id); }
    }
  }

  private syncFoods(w:World){
    this.foodUsed = 0;
    for (const f of w.food){
      if (f.amount<=0) continue;
      const g = this.getFromPool(this.foodPool, this.mundo, this.foodUsed++);
      g.clear(); g.circle(f.x, f.y, 5.5).fill(COL.food, 1).stroke({ width: 1.5, color: 0x98f9ff, alpha: 1 });
    }
    for (let i=this.foodUsed;i<this.foodPool.length;i++) if (this.foodPool[i]) this.foodPool[i].visible = false;
  }

  private syncHazards(w:World){
    this.hazardUsed = 0;
    for (const h of w.hazards){
      const g = this.getFromPool(this.hazardPool, this.mundo, this.hazardUsed++);
      g.clear(); g.circle(h.x, h.y, h.r).fill(0x7a1d1d, 1).stroke({ width: 1.5, color: COL.hazard, alpha: 1 });
    }
    for (let i=this.hazardUsed;i<this.hazardPool.length;i++) if (this.hazardPool[i]) this.hazardPool[i].visible = false;
  }

  private syncBeacons(w:World){
    this.beaconUsed = 0;
    const t = (w as any)._tick ?? 0;
    for (const b of w.beacons){
      const g = this.getFromPool(this.beaconPool, this.fx, this.beaconUsed++);
      const pulse = 0.5 + 0.5*Math.sin((t + this.beaconUsed*7)*0.1);
      const alpha = Math.min(0.4, 0.12 + (b.strength ?? 0.5)*0.35) * (0.8 + 0.2*pulse);
      const r = 2.0 + 2.0*(b.strength ?? 0.5)*(0.8 + 0.2*pulse);
      g.clear(); g.circle(b.x, b.y, r).fill(COL.beacon, alpha);
    }
    for (let i=this.beaconUsed;i<this.beaconPool.length;i++) if (this.beaconPool[i]) this.beaconPool[i].visible = false;
  }

  renderWorld(w:World){
    // Orden de dibujo
    this.syncInfluence(w);
    this.syncFoods(w);
    this.syncHazards(w);
    this.syncHexes(w);
    this.syncAnts(w);
    this.drawQueenUI(w);
    this.syncBeacons(w);

    // HUD
    const workers = w.ants.filter(a=>a.kind==="worker").length;
    const builders = w.ants.filter(a=>a.kind==="builder").length;
    const soldiers = w.ants.filter(a=>a.kind==="soldier").length;
    const foods = w.food.filter(f=>f.amount>0).length;
    const hazards = w.hazards.length;
    this.hudLabel.text = `W:${workers}  B:${builders}  S:${soldiers} | Food:${foods} Haz:${hazards} | Reina:${Math.round(w.stockFood)} | Huevos:${(w.meta?.broodEggsStaged ?? 0)}`;

    // Asegurar z-index
    this.fx.zIndex = 2;
    this.mundo.zIndex = 1;
    this.hud.zIndex = 3;
    this.app.stage.sortChildren();
  }

  destroy(){
    for (const g of this.hexMap.values()) g.destroy();
    for (const g of this.antMap.values()) g.destroy();
    for (const g of this.beaconPool) if (g) g.destroy();
    for (const g of this.foodPool) if (g) g.destroy();
    for (const g of this.hazardPool) if (g) g.destroy();
    this.hexMap.clear(); this.antMap.clear();
    this.beaconPool.length = 0; this.foodPool.length = 0; this.hazardPool.length = 0;
    this.mundo.destroy({ children: true });
    this.fx.destroy({ children: true });
    this.hud.destroy({ children: true });
  }
  private drawQueenUI(w:World){
    const q = w.hexes.find(h=>h.host==="queen");
    if (!q) return;

    // Aura (radio de influencia)
    const nonQueen = w.hexes.filter(h=>h.host!=="queen").length;
    const R = INFLUENCE_BASE_PX + nonQueen*INFLUENCE_PER_HEX_PX;

    if (!this.queenAura){ this.queenAura = new Graphics(); this.fx.addChild(this.queenAura); }
    const g = this.queenAura;
    g.clear();
    g.circle(q.cx, q.cy, R).stroke({ color: 0x0eeaff, alpha: 0.25, width: 1 });
    g.circle(q.cx, q.cy, 9).fill({ color: 0xff2bd6, alpha: 0.65 }); // reina brillante

    // Huevos (0..6) como puntitos amarillos alrededor
    const n = w.meta?.broodEggsStaged ?? 0;
    const needed = 6;
    for (let i=0;i<needed;i++){
      if (!this.queenEggDots[i]){ this.queenEggDots[i] = new Graphics(); this.fx.addChild(this.queenEggDots[i]); }
      const dot = this.queenEggDots[i];
      const ang = (i/needed) * Math.PI * 2;
      const rx = q.cx + Math.cos(ang) * (q.sidePx*0.55);
      const ry = q.cy + Math.sin(ang) * (q.sidePx*0.55);
      dot.clear();
      if (i < n){
        dot.circle(rx, ry, 2.5).fill({ color: 0xffd166, alpha: 0.95 }).stroke({ color: 0xffb700, width: 1, alpha: 0.85 });
        dot.visible = true;
      } else {
        dot.visible = false;
      }
    }
  }
}

