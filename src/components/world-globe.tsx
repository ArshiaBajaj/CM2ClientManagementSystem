"use client";

import { useEffect, useRef } from "react";
import { geoCentroid, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import atlas from "world-atlas/countries-110m.json";

type CountryFeature = Feature<Geometry, { name: string }>;

const world = feature(
  atlas as unknown as Parameters<typeof feature>[0],
  (atlas as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries,
) as unknown as FeatureCollection<Geometry, { name: string }>;

/**
 * The World View globe. Countries with Coach Me 2 teens glow blue; lines join countries that share a circle.
 * Drag to turn it. It turns slowly on its own unless the device asks for reduced motion.
 * Screen readers get the same information from the list each page renders next to it.
 */
export function WorldGlobe({
  highlight,
  links = [],
  label,
}: {
  highlight: string[];
  links?: Array<[string, string]>;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const lit = new Set(highlight);
    const byName = new Map(world.features.map((f) => [f.properties.name, f as CountryFeature]));
    const arcs = links
      .map(([a, b]) => [byName.get(a), byName.get(b)])
      .filter((pair): pair is [CountryFeature, CountryFeature] => Boolean(pair[0] && pair[1]))
      .map(([a, b]) => geoInterpolate(geoCentroid(a), geoCentroid(b)));

    const projection = geoOrthographic().clipAngle(90).precision(0.4);
    const path = geoPath(projection, ctx);
    const graticule = geoGraticule10();
    let rotation: [number, number] = [-20, -18];
    let size = 0;
    let dragging: { x: number; y: number; r: [number, number] } | null = null;
    let frame = 0;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const box = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = box.width;
      el.width = size * dpr;
      el.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      projection.translate([size / 2, size / 2]).scale(size / 2 - 6);
    };

    const draw = () => {
      projection.rotate(rotation);
      ctx.clearRect(0, 0, size, size);
      // Sphere
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.fillStyle = "#fffdf9";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(22,32,43,.55)";
      ctx.stroke();
      // Graticule
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = "rgba(22,32,43,.10)";
      ctx.stroke();
      // Land
      for (const f of world.features) {
        ctx.beginPath();
        path(f);
        const on = lit.has(f.properties.name);
        ctx.fillStyle = on ? "rgba(47,111,176,.85)" : "rgba(22,32,43,.10)";
        ctx.fill();
        ctx.strokeStyle = on ? "rgba(35,90,145,1)" : "rgba(22,32,43,.18)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      // Circle links
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "#c2643b";
      for (const arc of arcs) {
        ctx.beginPath();
        path({ type: "LineString", coordinates: Array.from({ length: 33 }, (_, i) => arc(i / 32)) });
        ctx.stroke();
      }
    };

    const tick = () => {
      if (!dragging && !still) rotation = [rotation[0] + 0.08, rotation[1]];
      draw();
      frame = requestAnimationFrame(tick);
    };

    const down = (e: PointerEvent) => {
      dragging = { x: e.clientX, y: e.clientY, r: rotation };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const k = 0.35;
      rotation = [
        dragging.r[0] + (e.clientX - dragging.x) * k,
        Math.max(-70, Math.min(70, dragging.r[1] - (e.clientY - dragging.y) * k)),
      ];
      if (still) draw();
    };
    const up = () => {
      dragging = null;
    };
    const key = (e: KeyboardEvent) => {
      const step = 12;
      if (e.key === "ArrowLeft") rotation = [rotation[0] - step, rotation[1]];
      else if (e.key === "ArrowRight") rotation = [rotation[0] + step, rotation[1]];
      else if (e.key === "ArrowUp") rotation = [rotation[0], Math.min(70, rotation[1] + step)];
      else if (e.key === "ArrowDown") rotation = [rotation[0], Math.max(-70, rotation[1] - step)];
      else return;
      e.preventDefault();
      draw();
    };

    resize();
    draw();
    if (!still) frame = requestAnimationFrame(tick);
    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(el);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("keydown", key);
    };
  }, [highlight, links]);

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={`${label} Use the arrow keys to turn the globe.`}
      tabIndex={0}
      className="aspect-square w-full cursor-grab touch-none active:cursor-grabbing"
    />
  );
}
