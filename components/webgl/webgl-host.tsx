'use client';

import { useRef, useSyncExternalStore } from 'react';
import { useWebGLScene } from './use-webgl-scene';
import type { SceneBuilder } from './scene-types';

function subscribeTheme(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
const readTheme = () => document.documentElement.classList.contains('theme-white');
const serverTheme = () => false;

/**
 * Mount point for a ported Three.js scene (THREEJS-ANIMATION-PLAN.md §6).
 * Decorative only (guardrail §7.5) — never the sole carrier of information,
 * so it's `aria-hidden` and click-through by default. `three` itself loads
 * lazily inside `useWebGLScene`, not here, so dropping this in a page adds
 * ~0 bytes until the container actually lays out.
 */
export function WebGLHost({
  build,
  accent,
  ink = '#171b18',
  className = '',
  interactive = false,
}: {
  build: SceneBuilder;
  accent: string;
  ink?: string;
  className?: string;
  interactive?: boolean;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const isLight = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  useWebGLScene(mount, build, accent, ink, interactive, isLight);
  return (
    <div
      ref={mount}
      className={`webgl-host ${className}`.trim()}
      aria-hidden="true"
      style={{
        pointerEvents: interactive ? 'auto' : 'none',
        width: '100%',
        height: '100%',
        position: 'relative',
        touchAction: interactive ? 'none' : 'auto',
      }}
    />
  );
}
