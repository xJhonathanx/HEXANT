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
import { ensureRendererMatchesCSS, ensureNeonCard, eventToWorld, centerCameraOn } from "./hexant/utilidades/camera";
import { findNatalHex } from "./hexant/utilidades/busqueda";

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
    let unresize: (() => void) | null = null;

    (async () => {
      // Sin resizeTo: el tamaño lo manda el CSS del canvas (ensureRendererMatchesCSS).
      // Con ambos, al redimensionar la ventana el buffer quedaba del tamaño del host y se veía escalado.
      app = new Application();
      await app.init({
        background: "#0b0b0b",
        antialias: true,
      });
      if (!hostRef.current) return;

      hostRef.current.appendChild(app.canvas);

      // estilo card ANTES de medir, y buffer interno = tamaño CSS
      ensureNeonCard(app.canvas);
      unresize = ensureRendererMatchesCSS(app);

      //  Espera un frame para que el layout aplique el tamaño real
      await new Promise(requestAnimationFrame);

      // Dimensiones reales del renderer
      const W = app.renderer.width;
      const H = app.renderer.height;

      // Mundo centrado con el tamaño real
      w = crearMundoInicial(W, H);
      bootstrapWorld(w, cfg, W * 0.5, H * 0.5);

      // Cámara centrada en el natal
      const q = findNatalHex(w);
      if (q) centerCameraOn(app, w, q.cx, q.cy);

      motor = new MotorDeRender(app);
      overlay = new OverlayScout(app);
      qfx = new QueenFX(app);

      // Primer render
      motor.renderWorld(w);
      overlay.update(w);
      qfx.update(w);

      // === ENTRADA SOBRE EL CANVAS (coordenadas de MUNDO) ===
      onCtx = (e: MouseEvent) => {
        if (!w || !app) return;
        e.preventDefault();
        const p = eventToWorld(app!, w as any, e);
        if (e.shiftKey)      placePattern(w, p.x, p.y);
        else if (e.ctrlKey)  placeHazard(w, p.x, p.y);
        else                 placeFood(w, p.x, p.y, 25);
        motor!.renderWorld(w);
        overlay!.update(w);
        qfx!.update(w);
      };
      app.canvas.addEventListener("contextmenu", onCtx, { passive: false });

      // Loop de juego
      const { ejecutarSistemas } = await import("./hexant/juego/sistemas");
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
      if (unresize) { try { unresize(); } catch {} }
      if (overlay) overlay.destroy();
      if (qfx) qfx.destroy();
      if (motor) { try { (motor as any).destroy?.(); } catch {} }
      if (app) app.destroy(true, { children: true, texture: true });
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", height: "100vh", overflow: "hidden", background: "#0b0b0b" }}
      title="Click derecho: comida (25). Shift: patrón. Ctrl: peligro. WASD/arrastrar: mover. Rueda: zoom. H: natal."
    />
  );
}
