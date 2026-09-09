import type * as THREE from 'three';
import type { SceneBuilder } from '../../scene-types';

// Storm-energy study: branching procedural lightning crackling around a
// swirling multi-color vortex portal. The reference centered these effects
// on a pair of named character weapons — dropped entirely per the port brief,
// leaving just the two abstract effects.

const BOLT_COUNT = 10;
const BOLT_SEGMENTS = 8;
const BRANCHES_PER_BOLT = 2;
const BRANCH_SEGMENTS = 4;
const BOLT_MIN_LEN = 2.4;
const BOLT_MAX_LEN = 4.4;
const REGEN_INTERVAL = 0.09; // re-strike cadence (flicker), not a per-frame rebuild like the reference

const RING_COUNT = 5;
const RING_BASE_RADIUS = 1.1;
const RING_STEP = 0.55;
const SWIRL_COUNT = 900;
const SWIRL_MIN_R = 0.6;
const SWIRL_MAX_R = 3.6;
const DUST_COUNT = 150;
const MAX_EXTENT = 4.6; // farthest a ring/bolt tip reaches — drives the frustum-fit scale

export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const bright = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : '#ffffff'), 0.7);
  const soft = accent.clone().lerp(ink, 0.5);

  // A handful of hue-shifted stops off the placement's own accent stand in
  // for the reference's literal rainbow spectrum, so the vortex still reads
  // as "multi-color" without reintroducing hardcoded neon hues.
  const hsl = { h: 0, s: 0, l: 0 };
  accent.getHSL(hsl);
  const hueShift = (delta: number) =>
    new THREE.Color().setHSL((hsl.h + delta + 1) % 1, Math.min(1, hsl.s + 0.05), THREE.MathUtils.clamp(hsl.l, 0.35, 0.72));
  const tints = [accent, hueShift(0.14), hueShift(0.28), hueShift(-0.14), soft];

  const group = new THREE.Group();
  scene.add(group);

  // --- portal core glow ---
  group.add(new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 40),
    new THREE.MeshBasicMaterial({ color: tints[0], transparent: true, opacity: 0.12, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }),
  ));
  const hotCore = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 32),
    new THREE.MeshBasicMaterial({ color: bright, transparent: true, opacity: 0.9, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  hotCore.position.z = 0.01;
  group.add(hotCore);

  // --- concentric vortex rings, each a different tint, counter-rotating for the swirl ---
  const rings: THREE.Mesh[] = [];
  const ringSpeeds: number[] = [];
  for (let i = 0; i < RING_COUNT; i++) {
    const radius = RING_BASE_RADIUS + i * RING_STEP;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.018 + i * 0.004, 6, 64),
      new THREE.MeshBasicMaterial({ color: tints[i % tints.length], wireframe: true, transparent: true, opacity: 0.6 - i * 0.06, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
    );
    ring.position.z = 0.02;
    group.add(ring);
    rings.push(ring);
    ringSpeeds.push((i % 2 === 0 ? 1 : -1) * (0.18 + i * 0.05));
  }

  const outerRadius = RING_BASE_RADIUS + RING_COUNT * RING_STEP;
  group.add(new THREE.Mesh(
    new THREE.RingGeometry(outerRadius, outerRadius + 0.5, 48),
    new THREE.MeshBasicMaterial({ color: tints[2], side: THREE.DoubleSide, transparent: true, opacity: 0.12, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  ));

  // --- swirl particles: shared Points buffer, orbiting the rings while drifting through depth ---
  const swirlAngle = new Float32Array(SWIRL_COUNT);
  const swirlRadius = new Float32Array(SWIRL_COUNT);
  const swirlSpeed = new Float32Array(SWIRL_COUNT);
  const swirlZ = new Float32Array(SWIRL_COUNT);
  const swirlZSpeed = new Float32Array(SWIRL_COUNT);
  const swirlPos = new Float32Array(SWIRL_COUNT * 3);
  const swirlCol = new Float32Array(SWIRL_COUNT * 3);
  for (let i = 0; i < SWIRL_COUNT; i++) {
    swirlAngle[i] = Math.random() * Math.PI * 2;
    swirlRadius[i] = SWIRL_MIN_R + Math.random() * (SWIRL_MAX_R - SWIRL_MIN_R);
    swirlSpeed[i] = (0.15 + Math.random() * 0.35) * (Math.random() < 0.5 ? 1 : -1);
    swirlZ[i] = (Math.random() - 0.5) * 1.6;
    swirlZSpeed[i] = 0.15 + Math.random() * 0.3;
    const c = tints[i % tints.length];
    swirlCol[i * 3] = c.r; swirlCol[i * 3 + 1] = c.g; swirlCol[i * 3 + 2] = c.b;
    swirlPos[i * 3] = Math.cos(swirlAngle[i]) * swirlRadius[i];
    swirlPos[i * 3 + 1] = Math.sin(swirlAngle[i]) * swirlRadius[i];
    swirlPos[i * 3 + 2] = swirlZ[i];
  }
  const swirlGeo = new THREE.BufferGeometry();
  swirlGeo.setAttribute('position', new THREE.BufferAttribute(swirlPos, 3));
  swirlGeo.setAttribute('color', new THREE.BufferAttribute(swirlCol, 3));
  const swirl = new THREE.Points(swirlGeo, new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.85, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
  group.add(swirl);

  // --- faint static dust for depth behind the portal ---
  const dustPos = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT * 3; i += 3) {
    dustPos[i] = (Math.random() - 0.5) * MAX_EXTENT * 2.4;
    dustPos[i + 1] = (Math.random() - 0.5) * MAX_EXTENT * 2.4;
    dustPos[i + 2] = -1.5 - Math.random() * 2.5;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  group.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: ink, size: 0.05, transparent: true, opacity: 0.3 })));

  // --- branching lightning: one shared LineSegments buffer, re-struck on an interval ---
  const SEGMENTS_PER_BOLT = BOLT_SEGMENTS + BRANCHES_PER_BOLT * BRANCH_SEGMENTS;
  const totalSegments = BOLT_COUNT * SEGMENTS_PER_BOLT;
  const boltPos = new Float32Array(totalSegments * 2 * 3);
  const boltCol = new Float32Array(totalSegments * 2 * 3);
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPos, 3));
  boltGeo.setAttribute('color', new THREE.BufferAttribute(boltCol, 3));
  const bolts = new THREE.LineSegments(boltGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
  group.add(bolts);

  const scratchColor = new THREE.Color();
  let ptr = 0;
  function writeSeg(p0: THREE.Vector3, p1: THREE.Vector3, fade0: number, fade1: number, tint: THREE.Color, dim: number) {
    boltPos[ptr] = p0.x; boltPos[ptr + 1] = p0.y; boltPos[ptr + 2] = p0.z;
    boltPos[ptr + 3] = p1.x; boltPos[ptr + 4] = p1.y; boltPos[ptr + 5] = p1.z;
    scratchColor.copy(bright).lerp(tint, 1 - fade0).multiplyScalar(dim);
    boltCol[ptr] = scratchColor.r; boltCol[ptr + 1] = scratchColor.g; boltCol[ptr + 2] = scratchColor.b;
    scratchColor.copy(bright).lerp(tint, 1 - fade1).multiplyScalar(dim);
    boltCol[ptr + 3] = scratchColor.r; boltCol[ptr + 4] = scratchColor.g; boltCol[ptr + 5] = scratchColor.b;
    ptr += 6;
  }

  // Jagged path between two points: each interior point gets a random offset
  // along the two axes perpendicular to the path direction (never along it,
  // so segments stay roughly monotonic instead of doubling back on themselves).
  function jitteredPath(start: THREE.Vector3, end: THREE.Vector3, segments: number, jitter: number): THREE.Vector3[] {
    const dir = end.clone().sub(start).normalize();
    const arbitrary = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const perpA = new THREE.Vector3().crossVectors(dir, arbitrary).normalize();
    const perpB = new THREE.Vector3().crossVectors(dir, perpA).normalize();
    const pts = [start.clone()];
    for (let s = 1; s <= segments; s++) {
      const p = new THREE.Vector3().lerpVectors(start, end, s / segments);
      if (s < segments) {
        p.addScaledVector(perpA, (Math.random() - 0.5) * jitter);
        p.addScaledVector(perpB, (Math.random() - 0.5) * jitter);
      }
      pts.push(p);
    }
    return pts;
  }

  const branchStart = Math.floor(BOLT_SEGMENTS * 0.45);
  function strikeBolts() {
    ptr = 0;
    for (let b = 0; b < BOLT_COUNT; b++) {
      const tint = tints[b % tints.length];
      const theta = Math.random() * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(theta), Math.sin(theta), (Math.random() - 0.5) * 0.6).normalize();
      const len = BOLT_MIN_LEN + Math.random() * (BOLT_MAX_LEN - BOLT_MIN_LEN);
      const start = dir.clone().multiplyScalar(0.15);
      const end = dir.clone().multiplyScalar(len);
      const path = jitteredPath(start, end, BOLT_SEGMENTS, 0.5);

      for (let s = 0; s < BOLT_SEGMENTS; s++) {
        writeSeg(path[s], path[s + 1], 1 - s / BOLT_SEGMENTS, 1 - (s + 1) / BOLT_SEGMENTS, tint, 1);
      }

      for (let br = 0; br < BRANCHES_PER_BOLT; br++) {
        const origin = path[branchStart + br] ?? path[branchStart];
        const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        const branchDir = dir.clone().applyAxisAngle(axis, (0.35 + Math.random() * 0.6) * (Math.random() < 0.5 ? 1 : -1));
        const bEnd = origin.clone().addScaledVector(branchDir, len * (0.3 + Math.random() * 0.25));
        const bPath = jitteredPath(origin, bEnd, BRANCH_SEGMENTS, 0.32);
        for (let s = 0; s < BRANCH_SEGMENTS; s++) {
          writeSeg(bPath[s], bPath[s + 1], 1 - s / BRANCH_SEGMENTS, 1 - (s + 1) / BRANCH_SEGMENTS, tint, 0.7);
        }
      }
    }
    boltGeo.attributes.position.needsUpdate = true;
    boltGeo.attributes.color.needsUpdate = true;
  }
  strikeBolts(); // build() must leave a fully-struck, settled frame for reduced motion

  // Keep the whole formation inside the camera frustum regardless of
  // container aspect (same reasoning as agent-field.tsx's fitGroupScale).
  const FIT_MARGIN = 0.92;
  const halfV = ctx.camera.position.z * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
  const fitScale = (aspect: number) => {
    const halfExtent = halfV * Math.min(1, aspect);
    group.scale.setScalar(Math.min(1, (halfExtent * FIT_MARGIN) / MAX_EXTENT));
  };
  fitScale(ctx.width / ctx.height);

  let regenTimer = 0;
  return {
    tick(t, dt) {
      regenTimer += dt;
      if (regenTimer >= REGEN_INTERVAL) {
        regenTimer = 0;
        strikeBolts();
      }

      rings.forEach((ring, i) => { ring.rotation.z += ringSpeeds[i] * dt; });
      hotCore.scale.setScalar(0.9 + Math.sin(t * 6) * 0.12);

      for (let i = 0; i < SWIRL_COUNT; i++) {
        swirlAngle[i] += swirlSpeed[i] * dt;
        swirlZ[i] += swirlZSpeed[i] * dt;
        if (swirlZ[i] > 0.8) swirlZ[i] -= 1.6;
        swirlPos[i * 3] = Math.cos(swirlAngle[i]) * swirlRadius[i];
        swirlPos[i * 3 + 1] = Math.sin(swirlAngle[i]) * swirlRadius[i];
        swirlPos[i * 3 + 2] = swirlZ[i];
      }
      swirlGeo.attributes.position.needsUpdate = true;
    },
    onResize(width, height) {
      fitScale(width / height);
    },
  };
};
