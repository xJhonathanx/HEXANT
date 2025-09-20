import React, { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import { MotorDeRender } from "./hexant/renderizado";
import { Reloj } from "./hexant/motor/Reloj";
import type { World } from "./hexant/tipos";
import { defaultCfg, Cfg } from "./hexant/juego/configuracion/predeterminados";
import { crearMundoInicial, bootstrapWorld } from "./hexant/juego";
import { placeFood, placeHazard, placePattern } from "./hexant/juego/sistemas/SistemaEntrada";

export default function Aplicacion() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let app: Application | null = null;
    let motor: MotorDeRender | null = null;
    let reloj: Reloj | null = null;
    let w: World | null = null;
    let cfg: Cfg = { ...defaultCfg };

    // HUD DOM (debug)
    let dbg: HTMLPreElement | null = null;

    (async () => {
      app = new Application();
      await app.init({
        background: "#0b0b0b",
        resizeTo: hostRef.current!,
        antialias: true
      });
      if (!hostRef.current) return;

      hostRef.current.appendChild(app.canvas);
      motor = new MotorDeRender(app);

      // HUD DOM
      dbg = document.createElement("pre");
      dbg.style.position = "absolute";
      dbg.style.left = "8px";
      dbg.style.top = "8px";
      dbg.style.margin = "0";
      dbg.style.padding = "0";
      dbg.style.font = "12px/1.2 monospace";
      dbg.style.color = "#bfbfbf";
      dbg.style.pointerEvents = "none";
      hostRef.current.appendChild(dbg);

      // Mundo + bootstrap
      w = crearMundoInicial(app.renderer.width, app.renderer.height);
      const cx = app.renderer.width * 0.5;
      const cy = app.renderer.height * 0.5;
      bootstrapWorld(w, cfg, cx, cy);

      // Sistemas
      const { ejecutarSistemas } = await import("./hexant/juego/sistemas");
      motor.renderWorld(w);

      // === ENTRADA SOBRE EL CANVAS (no el div) ===
      const onCtx = (e: MouseEvent) => {
        if (!w || !app) return;
        e.preventDefault();
        const rect = app.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (e.shiftKey)      placePattern(w, x, y);     // patrón random
        else if (e.ctrlKey)  placeHazard(w, x, y);      // peligro
        else                 placeFood(w, x, y, 50);    // << comida 50

        motor!.renderWorld(w);
      };
      app.canvas.addEventListener("contextmenu", onCtx, { passive: false });

      // Reloj
      reloj = new Reloj((_dt) => {
        if (!w) return;
        ejecutarSistemas(w, cfg);
        motor!.renderWorld(w);

        // === HUD DEBUG ===
        if (dbg && w) {
          const workers = w.ants.filter(a=>a.kind==="worker").length;
          const builders = w.ants.filter(a=>a.kind==="builder").length;
          const soldiers = w.ants.filter(a=>a.kind==="soldier").length;

          const fieldFoods = (w.food as any[]).filter(f=>!f.home);
          const totalField = fieldFoods.reduce((s,f)=> s + (f.amount ?? 0), 0);
          const nest = (w.food as any[]).find(f=>f.home);
          const nestAmt = nest ? (nest.amount ?? 0) : 0;

          const eggsStaged = w.meta?.broodEggsStaged ?? 0;
          const pending = w.meta?.broodTransferPending ? "yes" : "no";
          const TID = w.meta?.broodTargetHexId ?? null;
          const T = w.hexes.find(h=>h.id===TID) as any;
          const targetEggs = T?.eggs?.born ?? 0;

          const b = w.ants.find(a=>a.kind==="builder") as any;
          const bState = b ? `B @(${b.x|0},${b.y|0}) leg:${b.leg??"-"} egg:${b.eggCarry?1:0}` : "no builder";

          dbg.textContent =
`W:${workers}  B:${builders}  S:${soldiers}
Nest:${nestAmt} | Field:${fieldFoods.length} items (${totalField})
Eggs(staged):${eggsStaged} | Target:${targetEggs} | Pending:${pending}
${bState}`;
        }
      });
      reloj.start();

      // Limpieza
      return () => {
        if (app) app.canvas.removeEventListener("contextmenu", onCtx);
        if (dbg && hostRef.current) hostRef.current.removeChild(dbg);
      };
    })();

    return () => {
      if (reloj) reloj.stop();
      if (motor) motor.destroy();
      if (app) app.destroy(true, { children: true, texture: true });
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", height: "100vh", overflow: "hidden", position:"relative", background: "#0b0b0b" }}
      title="Click derecho: comida (50). Shift: patrón. Ctrl: peligro."
    />
  );
}
