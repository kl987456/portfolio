import type { SceneBuilder } from '../scene-types';

// Endless curving neural tunnel (404-page background). The camera holds still
// near the tunnel mouth; the tunnel itself slides toward it, and each ring is
// individually recycled to the far end once it passes the camera — geometry
// stays fixed-size forever instead of growing with distance traveled.

const RING_COUNT = 24;
const RING_SEGMENTS = 18;
const RING_SPACING = 9;
const TUNNEL_LENGTH = RING_COUNT * RING_SPACING;
const RING_RADIUS = 4.6;
const STRAND_COUNT = 6;
const PARTICLE_COUNT = 560;
const PULSE_COUNT = 12;
const CAMERA_Z = 6;
const LOOKAHEAD = 30;
const TRAVEL_SPEED = 5; // world units/sec the tunnel slides past the camera
const SPIRAL_TURNS = 2;
const TWO_PI = Math.PI * 2;

// Lissajous centerline. Every frequency multiplier here is an integer, which
// is what makes axisAt(z) === axisAt(z + TUNNEL_LENGTH) exactly — required
// for a recycled ring/particle/pulse to land back on the same curve phase
// instead of popping sideways.
function axisAt(z: number): [number, number] {
  const p = (z / TUNNEL_LENGTH) * TWO_PI;
  return [Math.sin(p * 2) * 4.2 + Math.cos(p) * 2.0, Math.cos(p * 3) * 3.0 + Math.sin(p) * 1.4];
}

// How far ahead of the camera something planted at `initial` depth sits once
// `travel` world-units have passed — wraps at TUNNEL_LENGTH so `travel` never
// grows unbounded and a ring that reaches the camera reappears at the far end.
function wrapDepth(initial: number, travel: number): number {
  const phase = (((travel - initial) % TUNNEL_LENGTH) + TUNNEL_LENGTH) % TUNNEL_LENGTH;
  return TUNNEL_LENGTH - phase;
}

// No THREE.Fog on this paper background — recession into the distance reads
// through this brightness falloff instead.
function depthFade(depth: number): number {
  return Math.max(0.12, Math.min(1, 1 - depth / (TUNNEL_LENGTH * 0.62)));
}

export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const bright = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : 0xffffff), 0.55);
  const soft = accent.clone().lerp(ink, 0.5);

  ctx.camera.fov = 72;
  ctx.camera.near = 0.4;
  ctx.camera.far = TUNNEL_LENGTH + 40;
  ctx.camera.updateProjectionMatrix();

  // --- layer rings (one shared LineSegments buffer for every ring) ---
  const ringInitDepth = new Float32Array(RING_COUNT);
  const ringDepth = new Float32Array(RING_COUNT);
  const ringPts = Array.from({ length: RING_COUNT }, () => new Float32Array(RING_SEGMENTS * 3));
  for (let i = 0; i < RING_COUNT; i++) ringInitDepth[i] = 3 + i * RING_SPACING;
  const ringColorFor = (i: number) => (i % 6 === 0 ? bright : i % 3 === 0 ? soft : accent);

  const ringPos = new Float32Array(RING_COUNT * RING_SEGMENTS * 6);
  const ringCol = new Float32Array(RING_COUNT * RING_SEGMENTS * 6);
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
  ringGeo.setAttribute('color', new THREE.BufferAttribute(ringCol, 3));
  const ringsMesh = new THREE.LineSegments(
    ringGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }),
  );
  scene.add(ringsMesh);

  // --- longitudinal axon strands linking the same angular slot across rings ---
  const strandStride = Math.floor(RING_SEGMENTS / STRAND_COUNT);
  const axonPos = new Float32Array(STRAND_COUNT * RING_COUNT * 6);
  const axonCol = new Float32Array(STRAND_COUNT * RING_COUNT * 6);
  const axonGeo = new THREE.BufferGeometry();
  axonGeo.setAttribute('position', new THREE.BufferAttribute(axonPos, 3));
  axonGeo.setAttribute('color', new THREE.BufferAttribute(axonCol, 3));
  const axonMesh = new THREE.LineSegments(
    axonGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }),
  );
  scene.add(axonMesh);

  function rebuildRings() {
    for (let i = 0; i < RING_COUNT; i++) {
      const depth = ringDepth[i];
      const z = CAMERA_Z - depth;
      const [ax, ay] = axisAt(z);
      const radius = RING_RADIUS + Math.sin((z / TUNNEL_LENGTH) * TWO_PI * 4) * 1.1;
      const fade = depthFade(depth);
      const color = ringColorFor(i);
      const pts = ringPts[i];
      for (let s = 0; s < RING_SEGMENTS; s++) {
        const a = (s / RING_SEGMENTS) * TWO_PI;
        pts[s * 3] = ax + Math.cos(a) * radius;
        pts[s * 3 + 1] = ay + Math.sin(a) * radius;
        pts[s * 3 + 2] = z;
      }
      const base = i * RING_SEGMENTS * 6;
      for (let s = 0; s < RING_SEGMENTS; s++) {
        const n = (s + 1) % RING_SEGMENTS;
        const o = base + s * 6;
        ringPos[o] = pts[s * 3]; ringPos[o + 1] = pts[s * 3 + 1]; ringPos[o + 2] = pts[s * 3 + 2];
        ringPos[o + 3] = pts[n * 3]; ringPos[o + 4] = pts[n * 3 + 1]; ringPos[o + 5] = pts[n * 3 + 2];
        ringCol[o] = color.r * fade; ringCol[o + 1] = color.g * fade; ringCol[o + 2] = color.b * fade;
        ringCol[o + 3] = ringCol[o]; ringCol[o + 4] = ringCol[o + 1]; ringCol[o + 5] = ringCol[o + 2];
      }
    }
    ringGeo.attributes.position.needsUpdate = true;
    ringGeo.attributes.color.needsUpdate = true;
  }

  function rebuildAxons() {
    let o = 0;
    for (let s = 0; s < STRAND_COUNT; s++) {
      const segIdx = s * strandStride;
      const color = s % 2 === 0 ? accent : soft;
      for (let i = 0; i < RING_COUNT; i++) {
        const j = (i + 1) % RING_COUNT;
        const gap = ringDepth[j] - ringDepth[i];
        // A ring that just recycled makes `gap` fall way outside one ring
        // spacing for a single frame — collapse the strand to a point
        // instead of drawing it clear across the tunnel.
        const connected = gap > RING_SPACING * 0.4 && gap < RING_SPACING * 1.6;
        const p1 = ringPts[i], p2 = connected ? ringPts[j] : ringPts[i];
        const fade = connected ? depthFade(ringDepth[i]) : 0;
        axonPos[o] = p1[segIdx * 3]; axonPos[o + 1] = p1[segIdx * 3 + 1]; axonPos[o + 2] = p1[segIdx * 3 + 2];
        axonPos[o + 3] = p2[segIdx * 3]; axonPos[o + 4] = p2[segIdx * 3 + 1]; axonPos[o + 5] = p2[segIdx * 3 + 2];
        axonCol[o] = color.r * fade; axonCol[o + 1] = color.g * fade; axonCol[o + 2] = color.b * fade;
        axonCol[o + 3] = axonCol[o]; axonCol[o + 4] = axonCol[o + 1]; axonCol[o + 5] = axonCol[o + 2];
        o += 6;
      }
    }
    axonGeo.attributes.position.needsUpdate = true;
    axonGeo.attributes.color.needsUpdate = true;
  }

  // --- synaptic particle cloud (one Points draw call) ---
  const particleInit = new Float32Array(PARTICLE_COUNT);
  const particleAngle0 = new Float32Array(PARTICLE_COUNT);
  const particleRadius = new Float32Array(PARTICLE_COUNT);
  const particleBaseColor = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particleInit[i] = Math.random() * TUNNEL_LENGTH;
    particleAngle0[i] = Math.random() * TWO_PI;
    particleRadius[i] = 1 + Math.random() * (RING_RADIUS + 2.5);
    const c = Math.random();
    const col = c < 0.45 ? accent : c < 0.8 ? soft : c < 0.93 ? ink : bright;
    particleBaseColor[i * 3] = col.r; particleBaseColor[i * 3 + 1] = col.g; particleBaseColor[i * 3 + 2] = col.b;
  }
  const particlePos = new Float32Array(PARTICLE_COUNT * 3);
  const particleCol = new Float32Array(PARTICLE_COUNT * 3);
  const particleDepth = new Float32Array(PARTICLE_COUNT);
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleCol, 3));
  const particlePoints = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.9, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }),
  );
  scene.add(particlePoints);

  function updateParticles() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const depth = particleDepth[i];
      const z = CAMERA_Z - depth;
      const [ax, ay] = axisAt(z);
      const angle = particleAngle0[i] + (depth / TUNNEL_LENGTH) * TWO_PI * SPIRAL_TURNS;
      const r = particleRadius[i];
      particlePos[i * 3] = ax + Math.cos(angle) * r;
      particlePos[i * 3 + 1] = ay + Math.sin(angle) * r;
      particlePos[i * 3 + 2] = z;
      const fade = depthFade(depth);
      particleCol[i * 3] = particleBaseColor[i * 3] * fade;
      particleCol[i * 3 + 1] = particleBaseColor[i * 3 + 1] * fade;
      particleCol[i * 3 + 2] = particleBaseColor[i * 3 + 2] * fade;
    }
    particleGeo.attributes.position.needsUpdate = true;
    particleGeo.attributes.color.needsUpdate = true;
  }

  // --- traveling data pulses: a few InstancedMesh groups sharing one sphere
  // geometry (one group per tint, since instance color needs a real per-vertex
  // 'color' attribute on the geometry to combine with — simpler to keep each
  // tint its own material.color instead) ---
  const pulseGeo = new THREE.SphereGeometry(0.6, 10, 10);
  const pulseGroups = [
    { color: accent, count: 6 },
    { color: soft, count: 4 },
    { color: bright, count: 2 },
  ];
  const pulseInit = new Float32Array(PULSE_COUNT);
  const pulseAngle = new Float32Array(PULSE_COUNT);
  const pulseRadius = new Float32Array(PULSE_COUNT);
  const pulseScale = new Float32Array(PULSE_COUNT);
  const pulseDepth = new Float32Array(PULSE_COUNT);
  for (let i = 0; i < PULSE_COUNT; i++) {
    pulseInit[i] = (i / PULSE_COUNT) * TUNNEL_LENGTH;
    pulseAngle[i] = Math.random() * TWO_PI;
    pulseRadius[i] = RING_RADIUS * 0.55 + (Math.random() - 0.5) * 3;
    pulseScale[i] = 0.7 + Math.random() * 0.6;
  }
  const dummy = new THREE.Object3D();
  const pulseMeshes = pulseGroups.map((g) => {
    const mesh = new THREE.InstancedMesh(
      pulseGeo,
      new THREE.MeshBasicMaterial({ color: g.color, transparent: true, opacity: 0.95, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }),
      g.count,
    );
    scene.add(mesh);
    return mesh;
  });

  function updatePulses() {
    let gi = 0;
    pulseMeshes.forEach((mesh, groupIdx) => {
      const count = pulseGroups[groupIdx].count;
      for (let k = 0; k < count; k++, gi++) {
        const depth = pulseDepth[gi];
        const z = CAMERA_Z - depth;
        const [ax, ay] = axisAt(z);
        dummy.position.set(ax + Math.cos(pulseAngle[gi]) * pulseRadius[gi], ay + Math.sin(pulseAngle[gi]) * pulseRadius[gi], z);
        dummy.scale.setScalar(pulseScale[gi]);
        dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  // --- camera: nearly stationary (geometry does the traveling), a gentle
  // sine sway stands in for the reference's mouse-driven pitch/yaw ---
  function placeCamera(t: number) {
    const [bx, by] = axisAt(CAMERA_Z);
    const [lx, ly] = axisAt(CAMERA_Z - LOOKAHEAD);
    ctx.camera.position.set(bx + Math.sin(t * 0.3) * 0.7, by + Math.cos(t * 0.23) * 0.45, CAMERA_Z);
    ctx.camera.lookAt(lx + Math.sin(t * 0.3 + 1) * 1.1, ly + Math.cos(t * 0.23 + 1) * 0.7, CAMERA_Z - LOOKAHEAD);
  }

  function advance(travel: number) {
    for (let i = 0; i < RING_COUNT; i++) ringDepth[i] = wrapDepth(ringInitDepth[i], travel);
    for (let i = 0; i < PARTICLE_COUNT; i++) particleDepth[i] = wrapDepth(particleInit[i], travel);
    for (let i = 0; i < PULSE_COUNT; i++) pulseDepth[i] = wrapDepth(pulseInit[i], travel);
    rebuildRings();
    rebuildAxons();
    updateParticles();
    updatePulses();
  }

  advance(0);
  placeCamera(0);

  let travel = 0;
  return {
    tick(t, dt) {
      travel = (travel + dt * TRAVEL_SPEED) % TUNNEL_LENGTH;
      advance(travel);
      placeCamera(t);
      ringsMesh.rotation.z = Math.sin(t * 0.15) * 0.08;
      axonMesh.rotation.z = ringsMesh.rotation.z;
    },
  };
};
