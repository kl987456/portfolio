import type * as THREE from 'three';

/**
 * Per-mount context handed to every scene builder. `accent`/`ink` carry the
 * portfolio's paper palette (project.color / project.ink, or the site
 * primary/foreground for placements with no single project) so each scene
 * re-tints itself instead of shipping the reference pack's neon-on-void look.
 */
export interface SceneContext {
  accent: string;
  ink: string;
  reduceMotion: boolean;
  isLight: boolean;
  camera: THREE.PerspectiveCamera;
  width: number;
  height: number;
}

export interface SceneHandle {
  /** Called once per animation frame; skipped entirely under reduced motion. */
  tick?: (t: number, dt: number) => void;
  /** Called after the host resizes the renderer/camera to a new box size. */
  onResize?: (width: number, height: number) => void;
  /** Release anything `build` doesn't hand back through `scene` itself. */
  dispose?: () => void;
}

/**
 * A scene owns geometry/materials/lights only — never the renderer, camera
 * lifecycle, resize plumbing, or disposal traversal; `useWebGLScene` (see
 * use-webgl-scene.ts) owns all of that once, for every scene.
 */
export type SceneBuilder = (
  scene: THREE.Scene,
  THREE_NS: typeof THREE,
  ctx: SceneContext,
) => SceneHandle | void;
