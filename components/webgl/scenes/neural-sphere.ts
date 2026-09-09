import type * as THREE from 'three';
import type { SceneBuilder } from '../scene-types';

// Fibonacci-lattice core: one Points draw call, dense enough to read as a
// sphere "shell" of nodes (not a filled ball) — exactly the reference's
// technique, just with all sizes/colors driven from the shared BufferAttribute
// approach instead of a custom vertex shader (no ShaderMaterial in this repo's
// WebGL scenes — see agent-field.tsx).
const NODE_COUNT = 650;
const LATTICE_RADIUS = 1.0;

const ORBIT_RADII = [1.35, 1.65, 1.95] as const;
const ORBIT_TILTS: readonly [number, number][] = [
  [0.35, 0.25],
  [-0.5, 0.65],
  [0.9, -0.35],
];
const ORBIT_COUNTS = [22, 16, 12] as const;

const PULSE_COUNT = 5;
const PULSE_MAX_RADIUS = 2.15;

interface Pulse {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  duration: number;
  next: number;
}

interface OrbitRing {
  group: THREE.Group;
  points: THREE.Points;
  pos: Float32Array;
  angles: Float32Array;
  speeds: Float32Array;
  radius: number;
}

export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const bright = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : '#ffffff'), 0.55);
  const wire = accent.clone().lerp(ink, 0.5);

  const group = new THREE.Group();
  scene.add(group);

  // Soft round dot for every Points material below — stock PointsMaterial
  // otherwise renders hard squares. Procedural (no external asset), but it's
  // a Texture, so unlike geometries/materials the host's traverse-disposal
  // never reaches it — cleaned up explicitly in this scene's own dispose().
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = spriteCanvas.height = 64;
  const sctx = spriteCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 64, 64);
  const sprite = new THREE.CanvasTexture(spriteCanvas);

  // --- Fibonacci lattice ---
  const golden = (1 + Math.sqrt(5)) / 2;
  const positions = new Float32Array(NODE_COUNT * 3);
  const colors = new Float32Array(NODE_COUNT * 3);

  for (let i = 0; i < NODE_COUNT; i++) {
    const theta = (2 * Math.PI * i) / golden;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / NODE_COUNT);
    const x = LATTICE_RADIUS * Math.sin(phi) * Math.cos(theta);
    const y = LATTICE_RADIUS * Math.sin(phi) * Math.sin(theta);
    const z = LATTICE_RADIUS * Math.cos(phi);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const r = Math.random();
    const c = r < 0.55
      ? accent.clone().lerp(ink, Math.random() * 0.5)
      : r < 0.85
        ? ink.clone().lerp(accent, Math.random() * 0.4)
        : bright.clone();
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const latticeGeo = new THREE.BufferGeometry();
  latticeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  latticeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const latticeMat = new THREE.PointsMaterial({
    size: 0.05, map: sprite, vertexColors: true, transparent: true,
    depthWrite: false, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  group.add(new THREE.Points(latticeGeo, latticeMat));

  // Synaptic connections: nearest-neighbour threshold derived from the mean
  // inter-node spacing on the lattice (area-per-point on a sphere), so it
  // stays correct if NODE_COUNT/LATTICE_RADIUS ever get retuned.
  const nnDist = LATTICE_RADIUS * Math.sqrt((4 * Math.PI) / NODE_COUNT);
  const maxConnectionDist = nnDist * 2.1;
  const lineIndices: number[] = [];
  for (let i = 0; i < NODE_COUNT; i += 2) {
    const x1 = positions[i * 3], y1 = positions[i * 3 + 1], z1 = positions[i * 3 + 2];
    let connections = 0;
    for (let j = i + 1; j < NODE_COUNT && connections < 4; j++) {
      const dx = x1 - positions[j * 3], dy = y1 - positions[j * 3 + 1], dz = z1 - positions[j * 3 + 2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < maxConnectionDist) {
        lineIndices.push(i, j);
        connections++;
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  lineGeo.setIndex(lineIndices);
  const lineMat = new THREE.LineBasicMaterial({
    color: wire, transparent: true, opacity: 0.25, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false,
  });
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  // --- luminous inner core (wireframe cage + solid glow + halo ring) ---
  const coreCage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.8, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  group.add(coreCage);
  const innerGlowMat = new THREE.MeshBasicMaterial({ color: bright, transparent: true, opacity: 0.5, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending });
  const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), innerGlowMat);
  group.add(innerGlow);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.54, 0.58, 48),
    new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide, transparent: true, opacity: 0.3, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  // --- geodesic orbit rings ---
  const ringColors = [accent, ink, bright];
  const rings: OrbitRing[] = ORBIT_RADII.map((radius, idx) => {
    const [tiltX, tiltY] = ORBIT_TILTS[idx];
    const ringGroup = new THREE.Group();
    ringGroup.rotation.x = tiltX;
    ringGroup.rotation.y = tiltY;

    const segments = 96;
    const guidePts: number[] = [];
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      guidePts.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    }
    const guideGeo = new THREE.BufferGeometry();
    guideGeo.setAttribute('position', new THREE.Float32BufferAttribute(guidePts, 3));
    const guideMat = new THREE.LineBasicMaterial({ color: ringColors[idx], transparent: true, opacity: 0.22, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending });
    ringGroup.add(new THREE.Line(guideGeo, guideMat));

    const count = ORBIT_COUNTS[idx];
    const pos = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let p = 0; p < count; p++) {
      angles[p] = Math.random() * Math.PI * 2;
      speeds[p] = 0.4 + Math.random() * 0.8;
      pos[p * 3] = Math.cos(angles[p]) * radius;
      pos[p * 3 + 1] = Math.sin(angles[p]) * radius;
    }
    const packetGeo = new THREE.BufferGeometry();
    packetGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const packetMat = new THREE.PointsMaterial({
      color: ringColors[idx], size: 0.06, map: sprite, transparent: true, opacity: 0.9,
      depthWrite: false, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const points = new THREE.Points(packetGeo, packetMat);
    ringGroup.add(points);

    group.add(ringGroup);
    return { group: ringGroup, points, pos, angles, speeds, radius };
  });

  // --- pulse waves: many independent shells, not one shared heartbeat ---
  // Each shell fires on its own randomized delay/duration so several are
  // ever mid-expansion at once — reads as async events arriving and being
  // absorbed by the core, not a single synchronized pulse.
  const pulseGeo = new THREE.SphereGeometry(1, 20, 14);
  const pulses: Pulse[] = Array.from({ length: PULSE_COUNT }, (_, i) => {
    const material = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? accent : bright, wireframe: true, transparent: true, opacity: 0, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(pulseGeo, material);
    mesh.visible = false;
    group.add(mesh);
    return { mesh, material, active: false, age: 0, duration: 1, next: 0.5 + i * 0.9 + Math.random() * 1.3 };
  });
  // Bake two shells mid-flight so the resting (t=0 / reduced-motion) frame
  // already reads as "pulsing", not as a dormant sphere waiting to start.
  [0.3, 0.65].forEach((k, i) => {
    const p = pulses[i];
    const radius = THREE.MathUtils.lerp(0.15, PULSE_MAX_RADIUS, k);
    p.mesh.visible = true;
    p.mesh.scale.setScalar(radius);
    p.material.opacity = (1 - k) * 0.5;
    p.active = true;
    p.age = k;
    p.duration = 1;
    p.next = 2 + i;
  });
  let coreEnergy = 0.3;

  // Fit the whole formation inside the camera frustum regardless of
  // container aspect (same reasoning as agent-field.tsx's fitGroupScale).
  const maxOrbitRadius = ORBIT_RADII[ORBIT_RADII.length - 1];
  const FIT_MARGIN = 0.88;
  const halfV = ctx.camera.position.z * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
  const fitScale = (aspect: number) => {
    const halfExtent = halfV * Math.min(1, aspect);
    group.scale.setScalar(Math.min(1, (halfExtent * FIT_MARGIN) / maxOrbitRadius));
  };
  fitScale(ctx.width / ctx.height);

  return {
    tick(t, dt) {
      group.rotation.y = t * 0.09;
      group.rotation.x = Math.sin(t * 0.06) * 0.08;

      coreCage.rotation.y = t * 0.2;
      coreCage.rotation.x = Math.sin(t * 0.15) * 0.2;

      rings.forEach((ring, idx) => {
        ring.group.rotation.z = t * (0.15 + idx * 0.05) * (idx % 2 === 0 ? 1 : -1);
        for (let p = 0; p < ring.angles.length; p++) {
          ring.angles[p] += ring.speeds[p] * 0.015;
          ring.pos[p * 3] = Math.cos(ring.angles[p]) * ring.radius;
          ring.pos[p * 3 + 1] = Math.sin(ring.angles[p]) * ring.radius;
        }
        ring.points.geometry.attributes.position.needsUpdate = true;
      });

      pulses.forEach((p) => {
        if (!p.active) {
          if (t >= p.next) {
            p.active = true;
            p.age = 0;
            p.duration = 1.1 + Math.random() * 1.3;
            p.mesh.visible = true;
            coreEnergy = Math.min(1, coreEnergy + 0.7);
          }
          return;
        }
        p.age += dt;
        const k = p.age / p.duration;
        if (k >= 1) {
          p.active = false;
          p.mesh.visible = false;
          p.next = t + 0.4 + Math.random() * 2.2;
          return;
        }
        p.mesh.scale.setScalar(THREE.MathUtils.lerp(0.15, PULSE_MAX_RADIUS, k));
        p.material.opacity = (1 - k) * 0.5;
      });

      coreEnergy *= 0.94;
      innerGlow.scale.setScalar(1 + coreEnergy * 0.25);
      innerGlowMat.opacity = 0.4 + coreEnergy * 0.5;
    },
    onResize(width, height) {
      fitScale(width / height);
    },
    dispose() {
      sprite.dispose();
    },
  };
};
