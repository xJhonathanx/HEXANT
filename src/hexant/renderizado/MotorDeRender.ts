// src/hexant/renderizado/MotorDeRender.ts
import { Application, Container, Graphics, Text } from "pixi.js";
import { axialToPixelPT } from "../utilidades/hex";
import type { World, Ant } from "../tipos";
import { GRID_COLOR, GRID_ALPHA } from "../juego/configuracion/predeterminados";
import { drawAnt } from "./renderizadores/HormigaRender";
import { CameraInput } from "../input/CameraInput";
import { findNatalHex } from "../utilidades/busqueda";
import { getCamera, natalDomeRadius, natalNavRadius } from "../utilidades/camera";

const NATAL_COLOR = 0xffe26a;
const HUD_HINT =
  "WASD/Flechas o arrastrar: mover · Rueda o +/-: zoom · H: volver al natal · Minimapa: saltar · " +
  "Clic der.: comida (Shift patrón, Ctrl peligro)";

export class MotorDeRender {
  private camInput?: CameraInput;
  private _camInit: boolean = false;

  // === caches / pools ===
  private antMap = new Map<number, Graphics>();

  private queenG: Graphics = new Graphics();
  private app: Application;

  private mundo = new Container();
  private layerBg  = new Container();      // fondo liso + AIR
   private layerGrid= new Container();      // grilla gris única
  private layerHex = new Container();
  private layerFood = new Container();
  private layerHaz = new Container();
  private layerAnts = new Container();
    private fxWorld  = new Container();      // halos/pulsos anclados al mundo
  private layerTop = new Container();      // huevos incubando + scout/kel



  private fx = new Container();
  private hud = new Container();
  private hudLabel: Text;
  private hudMini: Graphics = new Graphics();
  private hudNatal: Graphics = new Graphics();   // flecha al natal cuando está fuera de pantalla
  private hudNatalLabel: Text;
  private hudHint: Text;
  private animT: number = 0;

  // layout del minimapa (coords de renderer) para convertir clics en puntos de mundo
  private mini: { x:number; y:number; w:number; h:number; cx:number; cy:number; k:number } | null = null;

  // graphics únicos para bg y grid
  private gBg   = new Graphics();
  private gGrid = new Graphics();
  private gridKey = "";

  private hexPool: Graphics[] = [];    private hexUsed = 0;
  private foodPool: Graphics[] = [];   private foodUsed = 0;
  
  private fxPool: Graphics[] = [];    private fxUsed = 0;
  private topPool: Graphics[] = [];   private topUsed = 0;

  // === Pools de dibujo (asegurados por script) ===
  private hazardPool: Graphics[] = []; private hazardUsed = 0;
  private antPool: Graphics[] = [];    private antUsed = 0;

  private domeG: Graphics | null = null;

  constructor(app: Application) {
    this.app = app;


    // mundo (afectado por cámara)
    this.layerBg.addChild(this.gBg);
    this.layerGrid.addChild(this.gGrid);

        this.mundo.addChild(
      this.layerBg,
      this.layerGrid,
      this.layerHex,
      this.layerFood,
      this.layerHaz,
      this.layerAnts,
      this.fxWorld,
      this.layerTop
    );

        this.app.stage.addChild(this.mundo);
    this.app.stage.addChild(this.hud);

    this.hudLabel = new Text({
      text: "",
      style: { fill: 0xbfd6d6, fontSize: 14, fontFamily: "monospace", wordWrap: true, wordWrapWidth: 800 }
    });
    this.hudLabel.x = 8; this.hudLabel.y = 6;
    this.hud.addChild(this.hudLabel);

    this.hudNatalLabel = new Text({
      text: "NATAL · H",
      style: { fill: NATAL_COLOR, fontSize: 11, fontFamily: "monospace" }
    });
    this.hudNatalLabel.anchor.set(0.5);
    this.hudNatalLabel.visible = false;

    this.hudHint = new Text({
      text: HUD_HINT,
      style: { fill: 0x6f8f8f, fontSize: 11, fontFamily: "monospace", wordWrap: true, wordWrapWidth: 800 }
    });
    this.hudHint.x = 8;

    this.hud.addChild(this.hudMini, this.hudNatal, this.hudNatalLabel, this.hudHint);
    this.fx.zIndex = 2; this.mundo.zIndex = 1; this.hud.zIndex = 3;
    this.app.stage.sortChildren();
  }

  destroy(){
    this.camInput?.destroy();
    this.camInput = undefined;
  }

  /** Coords del renderer -> punto de mundo, si caen dentro del minimapa. */
  minimapToWorld(rx: number, ry: number){
    const m = this.mini;
    if (!m || rx < m.x || rx > m.x + m.w || ry < m.y || ry > m.y + m.h) return null;
    return {
      x: m.cx + (rx - (m.x + m.w / 2)) / m.k,
      y: m.cy + (ry - (m.y + m.h / 2)) / m.k,
    };
  }

  // ===== utils =====
  // === util pools
  private getFromPool(pool: Graphics[], parent: Container, i: number): Graphics {
    if (!pool[i]) { const g = new Graphics(); parent.addChild(g); pool[i] = g; }
    const g = pool[i]; g.visible = true; return g.clear();
  }
  private hideRest(pool: Graphics[], used: number) {
    for (let i = used; i < pool.length; i++){ const g = pool[i]; if (g){ g.clear(); g.visible = false; } }
  }

  // === Cámara
  private applyCamera(w:World){
    const cam = (w as any).camera ?? { x:0, y:0, scale:1 };
    this.mundo.scale.set(cam.scale ?? 1);
    this.mundo.x = -(cam.x ?? 0) * (cam.scale ?? 1);
    this.mundo.y = -(cam.y ?? 0) * (cam.scale ?? 1);
  }

// === Fondo liso + AIR
  private drawWorldBackground(w:World){
    const q = w.hexes.find(h => (h as any).host === "queen");
    if (!q){ this.gBg.clear(); return; }

    const cam = (w as any).camera ?? { x:0, y:0, scale:1 };
    const s = cam.scale ?? 1;

    // viewport en coords de mundo
    const W = this.app.renderer.width  / s;
    const H = this.app.renderer.height / s;
    const x0 = cam.x ?? 0;
    const y0 = cam.y ?? 0;

    const R = (w.meta?.domeRadius ?? (w as any).domeRadius ?? ((q as any).sidePx*6)) as number;

    // rectángulo exterior (fuera de AIR)
    const OUTSIDE = 0x090c10;
    const AIR     = 0x11161b;

    this.gBg.clear();
    this.gBg.rect(x0, y0, W, H).fill(OUTSIDE, 1.0);
    // círculo AIR
    this.gBg.circle(q.cx, q.cy, R).fill(AIR, 1.0);
  }
  
  // === Grilla gris única (ajusta grosor con el zoom)
  // Cubre el viewport esté donde esté la cámara; solo se rehace si la cámara cambió.
  private drawGrid(w:World){
    const q = findNatalHex(w);
    if (!q){ this.gGrid.clear(); this.gridKey = ""; return; }

    const cam = getCamera(w);
    const s = cam.scale || 1;

    // viewport en mundo
    const W = this.app.renderer.width  / s;
    const H = this.app.renderer.height / s;
    const x0 = cam.x ?? 0;
    const y0 = cam.y ?? 0;

    const S = q.sidePx;
    const key = `${x0}|${y0}|${s}|${W}|${H}|${S}|${q.cx}|${q.cy}`;
    if (key === this.gridKey) return;
    this.gridKey = key;

    // rango axial (relativo al natal) que cubre el viewport + 1 celda de margen
    const colW = Math.sqrt(3) * S;
    const left = x0 - q.cx - S, right  = x0 + W - q.cx + S;
    const top  = y0 - q.cy - S, bottom = y0 + H - q.cy + S;
    const rMin = Math.floor(top / (1.5 * S)), rMax = Math.ceil(bottom / (1.5 * S));

    // vértices pointy-top
    const vx: number[] = [], vy: number[] = [];
    for (let i = 0; i < 6; i++){
      const a = Math.PI/6 + i*(Math.PI/3);
      vx.push(S*Math.cos(a)); vy.push(S*Math.sin(a));
    }

    this.gGrid.clear();
    for (let r = rMin; r <= rMax; r++){
      const qMin = Math.floor(left / colW - r/2), qMax = Math.ceil(right / colW - r/2);
      for (let qax = qMin; qax <= qMax; qax++){
        const off = axialToPixelPT(qax, r, S);
        const cx = q.cx + off.x;
        const cy = q.cy + off.y;
        this.gGrid.moveTo(cx + vx[0], cy + vy[0]);
        for (let i = 1; i < 6; i++) this.gGrid.lineTo(cx + vx[i], cy + vy[i]);
        this.gGrid.closePath();
      }
    }
    this.gGrid.stroke({ color: GRID_COLOR, alpha: GRID_ALPHA, width: 1 / s, alignment: 0.5 });
  }





  // === Borde neón por segmentos (con progreso opcional) ===
  private drawHexNeon(g: Graphics, pts: number[], width: number, progress?: number){
    // paleta más “neón": púrpura eléctrico → cian
    const C1 = 0x7F2BFF;
    const C2 = 0x00E5FF;

    const segsPerEdge = 10;
    const total = segsPerEdge * 6;
    const cutoff = Math.max(0, Math.min(total, Math.round((progress ?? 1) * total)));

    let k = 0;
    for (let e = 0; e < 6; e++){
      const i0 = e * 2;
      const i1 = ((e + 1) % 6) * 2;
      const ax = pts[i0], ay = pts[i0 + 1];
      const bx = pts[i1], by = pts[i1 + 1];

      for (let s = 0; s < segsPerEdge; s++){
        if (k++ >= cutoff) return;
        const t0 = s / segsPerEdge, t1 = (s + 1) / segsPerEdge;
        const x0 = ax + (bx - ax) * t0, y0 = ay + (by - ay) * t0;
        const x1 = ax + (bx - ax) * t1, y1 = ay + (by - ay) * t1;

        const col = this._lerpColor(C1, C2, (e + t0) / 6);
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

  // --- helpers (guito & conexiones) ---
  private drawGlowLine(x1:number, y1:number, x2:number, y2:number){
    // halo externo (oscuro)
    this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
      .moveTo(x1, y1).lineTo(x2, y2)
      .stroke({ width: 5, color: 0x0b2b5f, alpha: 0.25 });
    // glow medio azulado
    this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
      .moveTo(x1, y1).lineTo(x2, y2)
      .stroke({ width: 2, color: 0x1aa7ff, alpha: 0.65 });
    // núcleo blanco de 1px
    this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
      .moveTo(x1, y1).lineTo(x2, y2)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.95 });
  }

  private drawGuitoHalo(cx:number, cy:number, r:number, active:boolean, t:number){
    // núcleo pequeño + halos tipo “LED”
    const R  = r * 0.30;
    const osc = active ? (0.90 + 0.10*Math.sin(t*0.12 + (cx+cy)*0.01)) : 0.75;

    // halo externo (suave)
    this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
      .circle(cx, cy, R*1.8).fill(0x0b2b5f, 0.20*osc);
    // halo medio
    this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
      .circle(cx, cy, R*1.25).fill(0x1587ff, 0.32*osc);
    // halo interior
    this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
      .circle(cx, cy, R*0.9).fill(0x5fd7ff, 0.45*osc);
    // núcleo brillante
    this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
      .circle(cx, cy, Math.max(2, R*0.38)).fill(0xffffff, 0.98);
    // anillo blanco muy fino (look circuito)
    this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
      .circle(cx, cy, R*0.62).stroke({ color: 0xffffff, width: 1, alpha: 0.9 });
  }

  // ===== main render =====
  renderWorld(w: World) {
    // tiempo normalizado (1 por frame a 60fps)
    this.animT += (this.app.ticker?.deltaMS ?? 16.6) / 16.6;
    // tiempo normalizado (1 por frame a 60fps)
    this.animT += (this.app.ticker?.deltaMS ?? 16.6) / 16.6;
    // avance de tiempo normalizado (≈1 por frame a 60fps)
    this.animT += (this.app.ticker?.deltaMS ?? 16.6) / 16.6;
  // Inicializar input de cámara una sola vez (WASD/flechas, arrastre, rueda, H, minimapa)
  if (!this._camInit) {
    this._camInit = true;
    try {
      this.camInput = new CameraInput(this.app, w, {
        minimapToWorld: (rx, ry) => this.minimapToWorld(rx, ry),
      });
    } catch {}
  }

  // Aplicar cámara
  this.applyCamera(w);

  // Reset de contadores de pools
  this.hexUsed = this.foodUsed = this.hazardUsed = this.antUsed = this.fxUsed = this.topUsed = 0;

  // Fondo + Grilla
  this.drawWorldBackground(w);
  this.drawGrid(w);

  // Sincronizar mundo
  this.syncDome(w);
  this.syncHexes(w);
  this.syncFood(w);
  this.syncHazards(w);
  this.syncAnts(w);
  this.drawQueen(w);
  this.drawUmbilical(w);

  // HUD (stats)
  const workers = w.ants.filter((a: any) => a.kind === "worker").length;
  const builders = w.ants.filter((a: any) => a.kind === "builder").length;
  const soldiers = w.ants.filter((a: any) => a.kind === "soldier").length;
  const foods    = w.food.filter((f: any) => (f.amount ?? 0) > 0).length;
  const hazards  = w.hazards.length;
  const bank     = Math.round((w as any).stockFood ?? 0);
  const eggsAtQueen = (w.eggs ?? []).filter((e: any) => e.state === "atQueen").length;

  const zoom     = getCamera(w).scale || 1;

  this.hudLabel.text =
      `W:${workers}  B:${builders}  S:${soldiers} | Food:${foods} Haz:${hazards} | Banco:${bank} | Huevos:${eggsAtQueen} | Zoom x${zoom.toFixed(2)}`;
  // textos del HUD: que no se metan bajo el minimapa (200px + margen) ni se salgan del canvas
  const labelWrap = Math.max(160, this.app.renderer.width - 230);
  if (this.hudLabel.style.wordWrapWidth !== labelWrap) this.hudLabel.style.wordWrapWidth = labelWrap;
  const hintWrap = Math.max(200, this.app.renderer.width - 16);
  if (this.hudHint.style.wordWrapWidth !== hintWrap) this.hudHint.style.wordWrapWidth = hintWrap;
  this.hudHint.y = this.app.renderer.height - this.hudHint.height - 6;

  // Minimapa + indicador del natal fuera de pantalla
  this.drawMinimap(w);
  this.drawNatalIndicator(w);

  // Ocultar sobrantes de pools
  this.hideRest(this.hexPool, this.hexUsed);
  this.hideRest(this.foodPool, this.foodUsed);
  this.hideRest(this.hazardPool, this.hazardUsed);
  this.hideRest(this.fxPool, this.fxUsed);
  this.hideRest(this.topPool, this.topUsed);
}




  // ===== dome (AIR) =====
  private syncDome(w: World) {
    const q = w.hexes.find(h => (h as any).host === "queen");
    if (!q) return;

    if (!this.domeG) {
      this.domeG = new Graphics();
      this.fxWorld.addChildAt(this.domeG, 0);
    }
    const r = (w as any).domeRadius ?? (w as any).smellRadius ?? ((q as any).sidePx * 6);
    this.domeG
      .clear()
      .circle((q as any).cx, (q as any).cy, r)
      .stroke({ color: 0x0aa3a3, width: 1, alpha: 0.55, alignment: 0.5 }); // 1px como pediste
  }

  // ===== queen + eggs glow/orbit =====
  private drawQueen(w: World) {
    const q = w.hexes.find(h => (h as any).host === "queen");
    if (!q) { this.queenG.visible = false; return; }

    if (this.queenG.parent !== this.layerTop) this.layerTop.addChild(this.queenG);
    this.queenG.visible = true;
    this.queenG.clear();

    const R = 10;
    const cx = (q as any).cx, cy = (q as any).cy;

    // cuerpo
    this.queenG.circle(cx, cy, R).fill(0xfff1a8, 1.0);
    this.queenG.circle(cx, cy, R + 3).stroke({ color: 0xffe26a, width: 2, alpha: 0.7 });

    // huevos orbitando (azul claro)
    const eggs = (w.eggs ?? []).filter((e:any)=> e.state === "atQueen" || (!e.hexId && e.state !== "incubating"));
    const t = this.animT;
    const n = eggs.length;
    if (n > 0) {
      const ringR = R + 18;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + t * 0.05;
        const ex = cx + Math.cos(a) * ringR;
        const ey = cy + Math.sin(a) * ringR;
        this.queenG.circle(ex, ey, 3)
          .fill(0x9be7ff, 0.95)
          .stroke({ color: 0x5bc8ff, width: 1, alpha: 0.9 });
      }
    }
  }

  // ===== hexes (and egg spots inside hexes) =====
  private syncHexes(w: World) {
    const t = this.animT;

    for (const h of w.hexes) {
    /* culling */ if (!this._inView(w, h.cx, h.cy)) continue;const g = this.getFromPool(this.hexPool, this.layerHex, this.hexUsed++);
      const r = (h as any).sidePx;
      const cx = (h as any).cx;
      const cy = (h as any).cy;

      // vértices para neón
      const pts: number[] = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 3 * i + Math.PI / 6;
        pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      // 2px los hexágonos
      this.drawHexNeon(g, pts, 2);

      // --- GUITO (si existe) ---
      const G:any = (h as any).guito;
      if (G) {
        this.drawGuitoHalo(cx, cy, r, !!G.active, t);
      }

      // huevos incubando (entidades)
      const incubating = (w.eggs ?? []).filter(e => e.state === 'incubating' && (e as any).hexId === (h as any).id);
      if (incubating.length > 0) {
        const rr = r * 0.72;
        for (let i = 0; i < incubating.length; i++) {
          const ei: any = incubating[i];
          let ex = ei.x, ey = ei.y;
          if (ex == null || ey == null) {
            const idx = (ei.slot ?? i) % 6;
            const aa = Math.PI / 3 * idx + Math.PI / 6;
            ex = cx + rr * Math.cos(aa);
            ey = cy + rr * Math.sin(aa);
          }
          this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
            .circle(ex, ey, 3)
            .fill(0x9be7ff, 0.95)
            .stroke({ color: 0x5bc8ff, width: 1, alpha: 0.9 });

          if ((ei as any)._feedFx > 0) {
            this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
              .circle(ex, ey, 5)
              .stroke({ color: 0x00ff99, width: 2, alpha: 0.9 });
            (ei as any)._feedFx--;
          }
        }
      }

      // progreso de construcción (mantengo, pero con trazo 2px)
      const built = (h as any).builtUnits ?? 0;
      const target = (h as any).targetUnits ?? 0;
      const done = !!(h as any).completed;
      const prog   = target > 0 ? Math.min(1, built/target) : (done ? 1 : 1);
      if (!done && target > 0 && built > 0) {
        this.drawHexNeon(g, pts, 2, prog);

        const verts: Array<{x:number,y:number}> = [];
        for (let i=0;i<6;i++){
          const a = Math.PI/3*i + Math.PI/6;
          verts.push({ x: cx + r*Math.cos(a), y: cy + r*Math.sin(a) });
        }
        const total = Math.min(1, built / target) * 6;
        const full = Math.floor(total);
        const partial = total - full;

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
        g.stroke({ color: 0xffffff, width: 2, alpha: 0.95 });
      }

      // huevos "colocados" (spots)
      const born = (h as any).eggs?.born ?? 0;
      const spots = (h as any).eggs?.spots as Array<{ x: number, y: number }> | undefined;
      if (spots && born > 0) {
        const count = Math.min(born, spots.length);
        for (let i = 0; i < count; i++) {
          const p = spots[i];
          this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
            .circle(p.x, p.y, 3)
            .fill(0x5bc8ff, 1);
        }
      }
    }

    // --- Conexiones entre guitos activos ---
    const dirs: Array<[number,number]> = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
    const active = w.hexes.filter(h => !!(h as any).guito?.active);

    for (const h of active){
      const aq = (h as any).aq ?? 0, ar = (h as any).ar ?? 0;
      for (const d of dirs){
        const nq = aq + d[0], nr = ar + d[1];
        const nb = w.hexes.find(x => (x as any).aq===nq && (x as any).ar===nr);
        if (!nb || !(nb as any).guito?.active) continue;
        if (nb.id < h.id) continue; // evita dibujar dos veces

        this.drawGlowLine((h as any).cx, (h as any).cy, (nb as any).cx, (nb as any).cy);
      }
    }

    // --- Pulsos (si tu meta los genera) ---
    const pulses = (w.meta as any)?.guitoPulses ?? [];
    for (const p of pulses){
      const A = w.hexes.find(h => h.id === (p as any).a);
      const B = w.hexes.find(h => h.id === (p as any).b);
      if (!A || !B) continue;
      const tt = (p as any).t ?? 0;
      const x = A.cx + (B.cx - A.cx) * tt;
      const y = A.cy + (B.cy - A.cy) * tt;

      // pequeño destello con halo
      this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
        .circle(x, y, 4).fill(0x0b2b5f, 0.18);
      this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
        .circle(x, y, 2.5).fill(0x1aa7ff, 0.75);
      this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
        .circle(x, y, 1.6).fill(0xffffff, 0.98);
    }
  }

  // ===== food =====
  private syncFood(w: World) {
    for (const f of w.food) {
    /* culling */ if (!this._inView(w, f.x, f.y)) continue;if ((f as any).amount <= 0) continue;
      this.getFromPool(this.foodPool, this.layerFood, this.foodUsed++) .circle((f as any).x, (f as any).y, 5).fill(0x6cf9ff, 1).stroke({ color: 0xffffff, width: 1, alpha: 0.85 });
    }
  }

  // ===== hazards =====
  private syncHazards(w: World) {
    for (const hz of w.hazards) {
    /* culling */ if (!this._inView(w, hz.x, hz.y)) continue;this.getFromPool(this.hazardPool, this.layerHaz, this.hazardUsed++)
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

      if ((a as any).kind === "nurse") {
        const pulse = (a as any).pulse ?? 0.9;
        this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
          .circle(g.x, g.y, 4)
          .stroke({ color: 0xffffff, width: 2, alpha: 0.6 * pulse + 0.3 });

        if (((a as any).carryingUnits ?? 0) > 0) {
          this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
            .circle(g.x, g.y, 2.5)
            .fill(0x9cffc7, 0.95)
            .stroke({ color: 0x00ff99, width: 1, alpha: 0.9 });
        }
      }
      g.visible = true;

      if ((a as any).kind === "nurse") {
        const pulse = (a as any).pulse ?? 0.9;
        this.getFromPool(this.topPool, this.layerTop, this.topUsed++)
          .circle(g.x, g.y, 4)
          .stroke({ color: 0xffffff, width: 2, alpha: 0.6 * pulse + 0.3 });
      }
    }

    for (const [id, g] of this.antMap) {
      if (!aliveIds.has(id)) {
        g.destroy();
        this.antMap.delete(id);
      }
    }
  }
  // === HUD: Minimapa centrado en el natal (zona navegable, AIR, hexes, FOW y viewport) ===
  private drawMinimap(w: World){
    const g = this.hudMini;
    g.clear();
    const q = findNatalHex(w);
    if (!q){ this.mini = null; return; }

    const pad = 10;
    const mw = 200, mh = 160;            // tamaño del minimapa
    const x = (this.app.renderer.width - mw - pad);
    const y = pad;
    const ox = x + mw * 0.5, oy = y + mh * 0.5;   // natal en el minimapa

    const navR = natalNavRadius(w);
    const k = (Math.min(mw, mh) * 0.5 - 6) / navR; // px de minimapa por px de mundo
    this.mini = { x, y, w: mw, h: mh, cx: q.cx, cy: q.cy, k };
    const mx = (wx: number) => ox + (wx - q.cx) * k;
    const my = (wy: number) => oy + (wy - q.cy) * k;

    // fondo + límite navegable + AIR
    g.rect(x, y, mw, mh).fill({ color: 0x0b0f14, alpha: 0.85 }).stroke({ color: 0x13202a, width: 1, alpha: 0.9 });
    g.circle(ox, oy, navR * k).stroke({ color: 0x1d3140, width: 1, alpha: 0.9 });
    g.circle(ox, oy, natalDomeRadius(w) * k)
      .fill({ color: 0x11161b, alpha: 1 })
      .stroke({ color: 0x0aa3a3, width: 1, alpha: 0.55 });

    // celdas visitadas por el scout (FOW)
    const fow: any = (w.meta as any)?.fow;
    if (fow?.visited){
      for (const key of fow.visited as Set<string>){
        const [aq, ar] = key.split(",").map(Number);
        const p = axialToPixelPT(aq, ar, q.sidePx);
        g.circle(mx(q.cx + p.x), my(q.cy + p.y), 1.5).fill({ color: 0x4b5563, alpha: 0.95 });
      }
    }

    // hexes de la colonia
    for (const h of w.hexes){
      if (h === q) continue;
      g.circle(mx(h.cx), my(h.cy), 2).fill({ color: h.completed ? 0x00e5ff : 0x7f2bff, alpha: 0.95 });
    }

    // natal
    g.circle(ox, oy, 3).fill({ color: NATAL_COLOR, alpha: 1 });

    // viewport actual (recortado al minimapa)
    const cam = getCamera(w);
    const s = cam.scale || 1;
    const vx0 = Math.max(x, mx(cam.x)), vx1 = Math.min(x + mw, mx(cam.x + this.app.renderer.width  / s));
    const vy0 = Math.max(y, my(cam.y)), vy1 = Math.min(y + mh, my(cam.y + this.app.renderer.height / s));
    if (vx1 > vx0 && vy1 > vy0){
      g.rect(vx0, vy0, vx1 - vx0, vy1 - vy0).stroke({ color: 0xcfe8ff, width: 1, alpha: 0.8 });
    }
  }

  // === HUD: flecha en el borde apuntando al natal cuando queda fuera de pantalla ===
  private drawNatalIndicator(w: World){
    const g = this.hudNatal;
    g.clear();
    this.hudNatalLabel.visible = false;
    const q = findNatalHex(w);
    if (!q) return;

    const cam = getCamera(w);
    const s = cam.scale || 1;
    const W = this.app.renderer.width, H = this.app.renderer.height;
    const sx = (q.cx - cam.x) * s, sy = (q.cy - cam.y) * s;   // natal en pantalla
    const r = q.sidePx * s;
    if (sx > -r && sx < W + r && sy > -r && sy < H + r) return;  // se ve (aunque sea en parte)

    // intersección del rayo centro→natal con el borde (margen extra arriba/abajo por los textos del HUD)
    const mX = 26, mTop = 46, mBottom = 38;
    const dx = sx - W / 2, dy = sy - H / 2;
    const t = Math.min(
      dx > 0 ? (W / 2 - mX) / dx : dx < 0 ? (mX - W / 2) / dx : Infinity,
      dy > 0 ? (H / 2 - mBottom) / dy : dy < 0 ? (mTop - H / 2) / dy : Infinity,
    );
    const ax = W / 2 + dx * t, ay = H / 2 + dy * t;
    const ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy);
    const nx = -uy, ny = ux;

    // punta de flecha (con muesca) hacia el natal
    g.poly([
      ax + ux * 10,          ay + uy * 10,
      ax - ux * 8 + nx * 7,  ay - uy * 8 + ny * 7,
      ax - ux * 3,           ay - uy * 3,
      ax - ux * 8 - nx * 7,  ay - uy * 8 - ny * 7,
    ]).fill({ color: NATAL_COLOR, alpha: 0.95 });
    g.circle(ax, ay, 13).stroke({ color: NATAL_COLOR, width: 1, alpha: 0.45 });

    // etiqueta hacia dentro de la pantalla, sin pisar el aro
    const lbl = this.hudNatalLabel;
    const off = 13 + 6 + Math.abs(ux) * lbl.width / 2 + Math.abs(uy) * lbl.height / 2;
    lbl.x = ax - ux * off;
    lbl.y = ay - uy * off;
    lbl.visible = true;
  }
  // Línea desde el borde del AIR hasta el SCOUT (usa meta.umbilical*)
  private drawUmbilical(w: World){
    const meta:any = w.meta as any;
    if (!meta?.umbilicalActive) return;
    const sx = meta.umbilicalX, sy = meta.umbilicalY;
    if (typeof sx !== "number" || typeof sy !== "number") return;

    const q:any = w.hexes.find(h => (h as any).host === "queen");
    if (!q) return;

    const R:number = (w.meta?.domeRadius ?? (w as any).domeRadius ?? (q.sidePx*6)) as number;
    const dx = sx - q.cx, dy = sy - q.cy;
    const d  = Math.hypot(dx,dy) || 1;
    const rx = q.cx + (dx/d) * R, ry = q.cy + (dy/d) * R;

    const parent:any = (this as any).fxWorld ?? (this as any).fx ?? this.mundo;
    this.getFromPool(this.fxPool, parent, this.fxUsed++)
      .moveTo(rx, ry).lineTo(sx, sy)
      .stroke({ color: 0x19c7d4, width: 3, alpha: 0.9 });
  }
  private _inView(w: World, x: number, y: number, pad: number = 64): boolean {
    const cam: any = (w as any).camera ?? { x: 0, y: 0, scale: 1 };
    const W = this.app.renderer.width;
    const H = this.app.renderer.height;
    const s = cam.scale || 1;
    const left   = cam.x - pad;
    const top    = cam.y - pad;
    const right  = cam.x + (W / s) + pad;
    const bottom = cam.y + (H / s) + pad;
    return x >= left && x <= right && y >= top && y <= bottom;
  }}







