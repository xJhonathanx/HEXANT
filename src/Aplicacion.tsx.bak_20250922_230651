//E:\GAME\HEXANTV1\src\Aplicacion.tsx

import React, { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import { MotorDeRender } from "./hexant/renderizado";
import { QueenFX } from "./hexant/renderizado/QueenFX";
import { OverlayScout } from "./hexant/renderizado/OverlayScout";
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
    let overlay: OverlayScout | null = null;
    let qfx: QueenFX | null = null;
    let reloj: Reloj | null = null;
    let w: World | null = null;
    let cfg: Cfg = { ...defaultCfg };
    let onCtx: ((e: MouseEvent) => void) | null = null;

    (async () => {
      app = new Application();
      await app.init({
        background: "#0b0b0b",
        resizeTo: hostRef.current!,
        antialias: true,
      });
      if (!hostRef.current) return;

      hostRef.current.appendChild(app.canvas);
      motor = new MotorDeRender(app);
      overlay = new OverlayScout(app);
      qfx = new QueenFX(app);

      // Mundo
      w = crearMundoInicial(app.renderer.width, app.renderer.height);
      const cx = app.renderer.width * 0.5;
      const cy = app.renderer.height * 0.5;
      bootstrapWorld(w, cfg, cx, cy);

      // Sistemas (loop)
      const { ejecutarSistemas } = await import("./hexant/juego/sistemas");
      motor.renderWorld(w);
      overlay.update(w);

      // === ENTRADA SOBRE EL CANVAS (no el div) ===
      onCtx = (e: MouseEvent) => {
        if (!w || !app) return;
        e.preventDefault(); // anula el menú
        const rect = app.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (e.shiftKey)      placePattern(w, x, y);
        else if (e.ctrlKey)  placeHazard(w, x, y);
        else                 placeFood(w, x, y, 25);

        motor!.renderWorld(w);
        overlay!.update(w);
        qfx!.update(w);
      };
      app.canvas.addEventListener("contextmenu", onCtx, { passive: false });

      // Reloj
      reloj = new Reloj((_dt) => {
        if (!w) return;
        ejecutarSistemas(w, cfg);
        motor!.renderWorld(w);
        overlay!.update(w);
        qfx!.update(w);
      });
      reloj.start();
    })();

    return () => {
      if (reloj) reloj.stop();
      if (onCtx && app) app.canvas.removeEventListener("contextmenu", onCtx as any);
      if (overlay) overlay.destroy();
      if (qfx) qfx.destroy();
      if (motor) { try { (motor as any).destroy?.(); } catch {} }if (app) app.destroy(true, { children: true, texture: true });
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", height: "100vh", overflow: "hidden", background: "#0b0b0b" }}
      title="Click derecho: comida (10). Shift: patrón. Ctrl: peligro."
    />
  );
}




