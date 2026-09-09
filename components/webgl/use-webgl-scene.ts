'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { Object3D } from 'three';
import type { SceneBuilder, SceneHandle } from './scene-types';
import { registerActiveScene } from './webgl-registry';

/**
 * The single place that owns a Three.js renderer/camera/scene lifecycle for
 * this portfolio (THREEJS-ANIMATION-PLAN.md §6). Every placement is a small
 * `SceneBuilder` (components/webgl/scenes/*.ts) plugged into this — resize,
 * disposal, reduced-motion, offscreen pausing and the one-context-at-a-time
 * rule all live here once, ported from the pattern proven in
 * components/agent-field.tsx rather than re-solved per scene.
 */
export function useWebGLScene(
  mountRef: RefObject<HTMLDivElement | null>,
  build: SceneBuilder,
  accent: string,
  ink: string,
  interactive = false,
  isLight = false,
) {
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const THREE = await import('three');
      if (cancelled || !el) return;

      // The container's percentage/flex-based size isn't guaranteed to be
      // resolved the instant this effect runs (e.g. mid dialog-open
      // transition, or a lazy tab becoming visible) — same wait as agent-field.tsx.
      let width = el.clientWidth, height = el.clientHeight;
      for (let tries = 0; tries < 10 && (width < 2 || height < 2); tries++) {
        await new Promise(requestAnimationFrame);
        if (cancelled || !el) return;
        width = el.clientWidth;
        height = el.clientHeight;
      }
      if (width < 2 || height < 2) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
      camera.position.set(0, 0, 10);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      el.appendChild(renderer.domElement);

      // A scene that reprojects world points on-screen (label/probe
      // placement, letter-avoidance) needs this done before its first frame:
      // camera.matrixWorldInverse otherwise stays identity until the first
      // renderer.render() call, and .project(camera) on a point exactly at
      // a group's local origin divides by zero under that stale matrix.
      camera.updateMatrixWorld();

      // White surfaces need pigment-like colors, rather than emitted light.
      const sceneAccent = new THREE.Color(accent);
      const sceneInk = new THREE.Color(ink);
      if (isLight) {
        const hsl = sceneAccent.getHSL({ h: 0, s: 0, l: 0 });
        sceneAccent.setHSL(hsl.h, Math.max(.7, hsl.s), Math.min(.32, hsl.l));
        const inkHsl = sceneInk.getHSL({ h: 0, s: 0, l: 0 });
        sceneInk.setHSL(hsl.h, .55, Math.min(.075, inkHsl.l));
      }
      const handle: SceneHandle = build(scene, THREE, { accent: `#${sceneAccent.getHexString()}`, ink: `#${sceneInk.getHexString()}`, reduceMotion, isLight, camera, width, height }) || {};

      // Round particles stay crisp at every size, without square point sprites.
      const dotCanvas = document.createElement('canvas');
      dotCanvas.width = dotCanvas.height = 64;
      const dotContext = dotCanvas.getContext('2d')!;
      const gradient = dotContext.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(.35, '#fff');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      dotContext.fillStyle = gradient;
      dotContext.fillRect(0, 0, 64, 64);
      const dotTexture = new THREE.CanvasTexture(dotCanvas);
      scene.traverse(object => {
        if (!(object instanceof THREE.Points)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.PointsMaterial && !material.map) {
            material.map = dotTexture;
            material.alphaTest = .02;
            material.needsUpdate = true;
          }
        }
      });

      // Ambient mouse parallax & interactive orbit controls
      let mouseNormX = 0, mouseNormY = 0;
      let targetMouseX = 0, targetMouseY = 0;
      let rotX = 0, rotY = 0;
      let targetRotX = 0, targetRotY = 0;
      let targetScrollY = 0;
      let isDragging = false;
      let startX = 0, startY = 0;

      const onWindowPointerMove = (e: PointerEvent) => {
        mouseNormX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseNormY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('pointermove', onWindowPointerMove, { passive: true });

      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        try { el.setPointerCapture(e.pointerId); } catch {}
        el.style.cursor = 'grabbing';
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        startX = e.clientX;
        startY = e.clientY;
        targetRotY += dx * 0.008;
        targetRotX += dy * 0.008;
        targetRotX = Math.max(-0.9, Math.min(0.9, targetRotX));
      };

      const onPointerUp = (e: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;
        try { el.releasePointerCapture(e.pointerId); } catch {}
        el.style.cursor = 'grab';
      };

      const onDblClick = () => {
        targetRotX = 0;
        targetRotY = 0;
      };

      if (interactive) {
        el.style.cursor = 'grab';
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);
        el.addEventListener('dblclick', onDblClick);
      }

      let raf = 0;
      let running = false;
      let startTime = performance.now();
      let lastTime = performance.now();

      const renderOnce = () => {
        camera.updateMatrixWorld();
        renderer.render(scene, camera);
      };

      const tick = () => {
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        const t = (now - startTime) * 0.001;
        const dt = Math.min(0.1, (now - lastTime) * 0.001);
        lastTime = now;

        // Smooth parallax, orbit damping & scroll-driven motion
        targetMouseX += (mouseNormX - targetMouseX) * 0.05;
        targetMouseY += (mouseNormY - targetMouseY) * 0.05;
        rotX += (targetRotX - rotX) * 0.1;
        rotY += (targetRotY - rotY) * 0.1;

        // Scroll progress through viewport (-1 when near top, 0 at center, +1 when near bottom)
        const elRect = el.getBoundingClientRect();
        const scrollNorm = (elRect.top + elRect.height * 0.5 - window.innerHeight * 0.5) / (window.innerHeight * 0.5);
        targetScrollY += (scrollNorm - targetScrollY) * 0.08;

        scene.rotation.y = rotY + targetMouseX * 0.14 + targetScrollY * 0.25;
        scene.rotation.x = rotX - targetMouseY * 0.1;
        scene.position.y = -targetScrollY * 0.75;

        handle.tick?.(t, dt);
        renderer.render(scene, camera);
      };

      const start = () => {
        if (running || reduceMotion) return;
        running = true;
        startTime = performance.now();
        lastTime = performance.now();
        tick();
      };
      const stop = () => {
        if (!running) return;
        running = false;
        cancelAnimationFrame(raf);
      };

      // Reduced motion: render whatever the scene built once, statically —
      // never spin an rAF loop for it.
      if (reduceMotion) renderOnce();

      const unregister = registerActiveScene({ pause: stop, resume: start });

      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && document.visibilityState === 'visible') start();
        else stop();
      }, { threshold: 0.05 });
      io.observe(el);

      const onVisibility = () => {
        if (document.visibilityState !== 'visible') stop();
        else if (io.takeRecords().some((r) => r.isIntersecting)) start();
      };
      document.addEventListener('visibilitychange', onVisibility);

      // Kick off if already on-screen (IntersectionObserver's first callback
      // covers this too, but that first callback can lag a frame or two).
      const rect = el.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) start();

      const ro = new ResizeObserver(() => {
        if (!el) return;
        const w = el.clientWidth, h = el.clientHeight;
        if (w < 2 || h < 2) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        handle.onResize?.(w, h);
        if (reduceMotion) renderOnce();
      });
      ro.observe(el);

      cleanup = () => {
        stop();
        unregister();
        window.removeEventListener('pointermove', onWindowPointerMove);
        if (interactive) {
          el.removeEventListener('pointerdown', onPointerDown);
          el.removeEventListener('pointermove', onPointerMove);
          el.removeEventListener('pointerup', onPointerUp);
          el.removeEventListener('pointercancel', onPointerUp);
          el.removeEventListener('dblclick', onDblClick);
        }
        document.removeEventListener('visibilitychange', onVisibility);
        io.disconnect();
        ro.disconnect();
        handle.dispose?.();
        scene.traverse((obj: Object3D) => {
          const m = obj as Object3D & { geometry?: { dispose(): void }; material?: { dispose(): void } | { dispose(): void }[] };
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
          else m.material?.dispose();
        });
        dotTexture.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountRef, build, accent, ink, interactive, isLight]);
}
