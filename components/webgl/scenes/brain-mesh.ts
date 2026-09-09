import type { SceneBuilder } from '../scene-types';

// Dual-hemisphere point cloud, warped from a sphere into lobular contours —
// halved from the reference's 3200 nodes since this only ever renders as a
// quiet backdrop, never a focal hero visual.
const NODE_COUNT = 1600;
const MAX_AXON_DIST = 1.55;
const CALLOSUM_DIST = 2.2; // wider bridge threshold for the corpus-callosum links near the midline

export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const bright = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : '#ffffff'), 0.55);

  const group = new THREE.Group();
  scene.add(group);

  // soft round dot — stock PointsMaterial renders hard squares otherwise
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

  // frontal reads brightest (executive/"active" tint), occipital stays a
  // plain deep ink — a 2-color stand-in for the reference's 4 fixed neon hues
  const lobeColor = (y: number, z: number) => {
    if (z > 1.5) return ink.clone().lerp(bright, 0.7); // frontal
    if (y > 0.5 && z <= 1.5 && z >= -2) return ink.clone().lerp(accent, 0.55); // parietal
    if (z < -2) return ink.clone(); // occipital
    return ink.clone().lerp(bright, 0.3); // temporal
  };

  // --- node cloud: spherical distribution warped into anatomical contours.
  // The x-shift (sign-based, not hemisphere-based) is what opens the
  // longitudinal-fissure gap between the two lobes — ported as-is from the
  // reference, which relies on the same quirk. ---
  const positions = new Float32Array(NODE_COUNT * 3);
  const baseColors = new Float32Array(NODE_COUNT * 3);
  const hemi = new Int8Array(NODE_COUNT);
  let maxRadius = 0;

  for (let i = 0; i < NODE_COUNT; i++) {
    hemi[i] = i < NODE_COUNT / 2 ? -1 : 1;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    let x = Math.sin(phi) * Math.cos(theta) * 3.8;
    let y = Math.cos(phi) * 4.2;
    let z = Math.sin(phi) * Math.sin(theta) * 5.2;

    const fold = Math.sin(x * 2.2) * Math.cos(y * 2.2) * Math.sin(z * 1.8) * 0.55; // sulcus/gyri undulation
    x += Math.sign(x || hemi[i]) * 0.55;
    x *= 1 + fold * 0.15;
    y *= 0.95 + fold * 0.12;
    z *= 1 + fold * 0.14;

    const b = i * 3;
    positions[b] = x;
    positions[b + 1] = y;
    positions[b + 2] = z;
    maxRadius = Math.max(maxRadius, Math.sqrt(x * x + y * y + z * z));

    const c = lobeColor(y, z);
    baseColors[b] = c.r;
    baseColors[b + 1] = c.g;
    baseColors[b + 2] = c.b;
  }

  const brainGeo = new THREE.BufferGeometry();
  brainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  brainGeo.setAttribute('color', new THREE.BufferAttribute(baseColors.slice(), 3));
  const brainMat = new THREE.PointsMaterial({
    size: 0.075, map: sprite, vertexColors: true, transparent: true,
    opacity: 0.4, depthWrite: false, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  group.add(new THREE.Points(brainGeo, brainMat));

  // --- axon connections: same-hemisphere near-neighbours, plus a few
  // corpus-callosum bridges close to the midline ---
  const axonIndices: number[] = [];
  for (let i = 0; i < NODE_COUNT; i += 2) {
    const x1 = positions[i * 3], y1 = positions[i * 3 + 1], z1 = positions[i * 3 + 2];
    let links = 0;
    for (let j = i + 1; j < NODE_COUNT && links < 3; j++) {
      const sameHemi = hemi[i] === hemi[j];
      const isCallosum = !sameHemi && Math.abs(y1) < 1.2 && Math.abs(x1) < 1.4;
      if (!sameHemi && !isCallosum) continue;
      const dx = x1 - positions[j * 3], dy = y1 - positions[j * 3 + 1], dz = z1 - positions[j * 3 + 2];
      const limit = isCallosum ? CALLOSUM_DIST : MAX_AXON_DIST;
      if (dx * dx + dy * dy + dz * dz < limit * limit) {
        axonIndices.push(i, j);
        links++;
      }
    }
  }
  const axonGeo = new THREE.BufferGeometry();
  axonGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  axonGeo.setIndex(axonIndices);
  const axonMat = new THREE.LineBasicMaterial({
    color: accent.clone().lerp(ink, 0.4), transparent: true, opacity: 0.18,
    blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false,
  });
  group.add(new THREE.LineSegments(axonGeo, axonMat));

  // --- deep thalamic core: wireframe cage + solid inner glow + halo ring,
  // standing in for the reference's fresnel ShaderMaterial (house style
  // fakes glow with emissive/additive materials, no custom shaders) ---
  const coreCage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2, 1),
    new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.35, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  group.add(coreCage);
  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 24, 24),
    new THREE.MeshBasicMaterial({ color: bright, transparent: true, opacity: 0.3, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  group.add(innerGlow);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(2.15, 2.24, 48),
    new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide, transparent: true, opacity: 0.25, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  // Fit the whole formation inside the camera frustum regardless of the
  // about-lead container's aspect (same technique as agent-field/neural-sphere).
  const FIT_MARGIN = 0.9;
  const halfV = ctx.camera.position.z * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
  const fitScale = (aspect: number) => {
    const halfExtent = halfV * Math.min(1, aspect);
    group.scale.setScalar(Math.min(1, (halfExtent * FIT_MARGIN) / maxRadius));
  };
  fitScale(ctx.width / ctx.height);

  // One slow travelling activation wave along z, blending each node's base
  // tint toward `bright` as the wavefront passes. No per-vertex shader here,
  // so this runs on the CPU each frame — cheap (NODE_COUNT lerps, no sqrt).
  const colorAttr = brainGeo.attributes.color.array as Float32Array;
  const applyWave = (waveZ: number, strength: number) => {
    for (let i = 0; i < NODE_COUNT; i++) {
      const dz = positions[i * 3 + 2] - waveZ;
      const falloff = Math.exp(-dz * dz * 0.35) * strength; // 0.35 tuned for this shape's z-scale (~±6)
      const b = i * 3;
      colorAttr[b] = baseColors[b] + (bright.r - baseColors[b]) * falloff;
      colorAttr[b + 1] = baseColors[b + 1] + (bright.g - baseColors[b + 1]) * falloff;
      colorAttr[b + 2] = baseColors[b + 2] + (bright.b - baseColors[b + 2]) * falloff;
    }
    brainGeo.attributes.color.needsUpdate = true;
  };
  applyWave(0.5, 0.35); // resting/reduced-motion frame: already mid-pulse, not flat

  return {
    tick(t) {
      group.rotation.y = t * 0.05;
      group.rotation.x = Math.sin(t * 0.08) * 0.05;
      group.position.y = Math.sin(t * 0.35) * 0.08;

      coreCage.rotation.y = t * 0.1;
      coreCage.rotation.x = Math.sin(t * 0.07) * 0.1;
      innerGlow.scale.setScalar(1 + Math.sin(t * 0.6) * 0.06);

      applyWave(Math.sin(t * 0.35) * 4.5, 0.3); // slow wander, far quieter/slower than the reference's click-triggered seizure wave
    },
    onResize(width, height) {
      fitScale(width / height);
    },
    dispose() {
      sprite.dispose();
    },
  };
};
