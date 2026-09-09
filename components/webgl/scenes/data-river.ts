import type { SceneBuilder } from '../scene-types';

// Five braided ribbons that all originate from one point (radius(0) = 0 below)
// and fan out toward the viewer — one accepted query, branching into rows.
const BRANCH_COUNT = 5;
const SPLINE_STEPS = 20;    // CatmullRom control points per branch
const FRAME_SAMPLES = 100;  // arc-length position/frame lookup resolution per branch
const PARTICLE_COUNT = 4200;
const Z_START = -13;        // the single convergence point
const Z_END = 3.5;          // fanned-out end, near the camera

export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const hi = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : '#ffffff'), 0.55);
  const mix = accent.clone().lerp(ink, 0.45);
  const ribbonTints = [accent, mix, ink, hi, mix.clone().lerp(ink, 0.35)];

  const curves: InstanceType<typeof THREE.CatmullRomCurve3>[] = [];
  for (let s = 0; s < BRANCH_COUNT; s++) {
    const phase = (s / BRANCH_COUNT) * Math.PI * 2;
    const spread = 1.5 + (s % 2) * 1.1;
    const points: InstanceType<typeof THREE.Vector3>[] = [];
    for (let i = 0; i <= SPLINE_STEPS; i++) {
      const t = i / SPLINE_STEPS;
      const z = Z_START + t * (Z_END - Z_START);
      const meanderX = Math.sin(t * Math.PI * 1.3) * 3.2;
      const meanderY = Math.sin(t * Math.PI * 0.9) * 1.1;
      const braid = t * Math.PI * 4.5 + phase;
      const radius = spread * Math.pow(t, 0.65); // 0 at t=0 for every branch -> single convergence point
      points.push(new THREE.Vector3(
        meanderX + Math.cos(braid) * radius,
        meanderY + Math.sin(braid) * radius * 0.55,
        z,
      ));
    }
    curves.push(new THREE.CatmullRomCurve3(points));
  }

  const riverGroup = new THREE.Group();
  scene.add(riverGroup);

  const ribbonMeshes = curves.map((curve, idx) => {
    const geo = new THREE.TubeGeometry(curve, 72, 0.3 + (idx % 2) * 0.2, 6, false);
    const mat = new THREE.MeshBasicMaterial({
      color: ribbonTints[idx % ribbonTints.length],
      wireframe: true,
      transparent: true,
      opacity: 0.16 + (idx % 2) * 0.08,
      blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    riverGroup.add(mesh);
    return mesh;
  });

  // Precompute each branch's arc-length position + Frenet frame at build time.
  // The reference called curve.getPoint/getTangent per particle per frame
  // (12k particles x 60fps); a flat lookup table + lerp is the same "particles
  // riding a rotating frame around the spline" technique for a fraction of the cost.
  const stride = (FRAME_SAMPLES + 1) * 3;
  const framePos = new Float32Array(BRANCH_COUNT * stride);
  const frameBin = new Float32Array(BRANCH_COUNT * stride);
  const frameNorm = new Float32Array(BRANCH_COUNT * stride);
  curves.forEach((curve, s) => {
    const pts = curve.getSpacedPoints(FRAME_SAMPLES);
    const { normals, binormals } = curve.computeFrenetFrames(FRAME_SAMPLES, false);
    const base = s * stride;
    for (let i = 0; i <= FRAME_SAMPLES; i++) {
      const o = base + i * 3;
      framePos[o] = pts[i].x; framePos[o + 1] = pts[i].y; framePos[o + 2] = pts[i].z;
      frameBin[o] = binormals[i].x; frameBin[o + 1] = binormals[i].y; frameBin[o + 2] = binormals[i].z;
      frameNorm[o] = normals[i].x; frameNorm[o + 1] = normals[i].y; frameNorm[o + 2] = normals[i].z;
    }
  });

  // Flow particles: one shared Points buffer, never a mesh per particle.
  const pBranch = new Uint8Array(PARTICLE_COUNT);
  const pT = new Float32Array(PARTICLE_COUNT);
  const pSpeed = new Float32Array(PARTICLE_COUNT);
  const pRadius = new Float32Array(PARTICLE_COUNT);
  const pAngle0 = new Float32Array(PARTICLE_COUNT);
  const pRotSpeed = new Float32Array(PARTICLE_COUNT);
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pBranch[i] = Math.floor(Math.random() * BRANCH_COUNT);
    pT[i] = Math.random(); // pre-spread across the whole flow, not bunched at the source
    pSpeed[i] = 0.045 + Math.random() * 0.08;
    pRadius[i] = Math.sqrt(Math.random()) * 1.6; // sqrt so particles fill the disk uniformly, not clumped on-axis
    pAngle0[i] = Math.random() * Math.PI * 2;
    pRotSpeed[i] = 0.3 + Math.random() * 0.5;

    const r = Math.random();
    const col = r < 0.5 ? accent : r < 0.78 ? ink : r < 0.92 ? mix : hi;
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }

  const layout = (elapsed: number) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const f = pT[i] * FRAME_SAMPLES;
      const idx = f >= FRAME_SAMPLES ? FRAME_SAMPLES - 1 : f | 0;
      const frac = f - idx;
      const base = pBranch[i] * stride + idx * 3;
      const o1 = base + 3;

      const px = framePos[base] + (framePos[o1] - framePos[base]) * frac;
      const py = framePos[base + 1] + (framePos[o1 + 1] - framePos[base + 1]) * frac;
      const pz = framePos[base + 2] + (framePos[o1 + 2] - framePos[base + 2]) * frac;

      const angle = pAngle0[i] + elapsed * pRotSpeed[i];
      const radius = pRadius[i];
      const ca = Math.cos(angle) * radius;
      const sa = Math.sin(angle) * radius;

      const oi = i * 3;
      positions[oi] = px + frameBin[base] * ca + frameNorm[base] * sa;
      positions[oi + 1] = py + frameBin[base + 1] * ca + frameNorm[base + 1] * sa;
      positions[oi + 2] = pz + frameBin[base + 2] * ca + frameNorm[base + 2] * sa;
    }
  };
  layout(0); // settle into a fully-flowing pose before the first frame renders

  const positionAttr = new THREE.BufferAttribute(positions, 3);
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', positionAttr);
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
    size: 0.075,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false,
  }));
  riverGroup.add(particles);

  // The single convergence point every branch is born from.
  const origin = new THREE.Vector3(0, 0, Z_START);
  const coreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 1),
    new THREE.MeshBasicMaterial({ color: hi, wireframe: true, transparent: true, opacity: 0.75, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  coreMesh.position.copy(origin);
  riverGroup.add(coreMesh);

  const coreGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 20, 20),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  coreGlow.position.copy(origin);
  riverGroup.add(coreGlow);

  return {
    tick(t, dt) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let nt = pT[i] + pSpeed[i] * dt;
        if (nt > 1) nt -= 1;
        pT[i] = nt;
      }
      layout(t);
      positionAttr.needsUpdate = true;

      ribbonMeshes.forEach((mesh, idx) => {
        mesh.rotation.z = Math.sin(t * 0.4 + idx) * 0.05;
      });

      coreMesh.rotation.y = t * 0.35;
      coreMesh.rotation.x = Math.sin(t * 0.3) * 0.25;
      coreGlow.scale.setScalar(1 + Math.sin(t * 1.6) * 0.12);
    },
  };
};
