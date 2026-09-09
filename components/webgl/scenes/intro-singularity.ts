import type * as THREE from 'three';
import type { SceneBuilder } from '../scene-types';

const CORE_NODES = 320;
const ACCRETION_PARTICLES = 2200;
const ACCRETION_RADIUS = 2.6;

export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent || '#ff5500');
  const ink = new THREE.Color(ctx.ink || '#ff8400');
  const bright = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : '#ffffff'), 0.7);
  const warmAmber = new THREE.Color('#ffaa00');

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // Procedural soft circular sprite texture
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = spriteCanvas.height = 64;
  const sctx = spriteCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,180,120,0.85)');
  grad.addColorStop(0.7, 'rgba(255,85,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 64, 64);
  const spriteTexture = new THREE.CanvasTexture(spriteCanvas);

  // --------------------------------------------------------------------------
  // 1. Central Quantum Core (Dual Wireframe Polyhedra)
  // --------------------------------------------------------------------------
  const coreGroup = new THREE.Group();
  rootGroup.add(coreGroup);

  const innerGeo = new THREE.IcosahedronGeometry(0.75, 1);
  const innerMat = new THREE.MeshBasicMaterial({
    color: accent,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  coreGroup.add(innerMesh);

  const outerGeo = new THREE.DodecahedronGeometry(1.05, 1);
  const outerMat = new THREE.MeshBasicMaterial({
    color: warmAmber,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
  });
  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  coreGroup.add(outerMesh);

  // Core dense nodal point cloud
  const corePos = new Float32Array(CORE_NODES * 3);
  const coreCols = new Float32Array(CORE_NODES * 3);
  for (let i = 0; i < CORE_NODES; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 0.55 + Math.random() * 0.4;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    corePos[i * 3] = x;
    corePos[i * 3 + 1] = y;
    corePos[i * 3 + 2] = z;

    const c = Math.random() > 0.4 ? accent : bright;
    coreCols[i * 3] = c.r;
    coreCols[i * 3 + 1] = c.g;
    coreCols[i * 3 + 2] = c.b;
  }
  const coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
  coreGeo.setAttribute('color', new THREE.BufferAttribute(coreCols, 3));
  const corePointsMat = new THREE.PointsMaterial({
    size: 0.055,
    map: spriteTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  const corePoints = new THREE.Points(coreGeo, corePointsMat);
  coreGroup.add(corePoints);

  // --------------------------------------------------------------------------
  // 2. Concentric Gyroscopic Quantum Rings
  // --------------------------------------------------------------------------
  const ringGroup = new THREE.Group();
  rootGroup.add(ringGroup);

  const ringConfigs = [
    { radius: 1.45, tube: 0.008, tiltX: 0.7, tiltZ: 0.3, speed: 0.8 },
    { radius: 1.85, tube: 0.007, tiltX: -0.85, tiltZ: 0.6, speed: -0.65 },
    { radius: 2.25, tube: 0.006, tiltX: 0.35, tiltZ: -0.9, speed: 0.5 },
  ];

  const ringMeshes = ringConfigs.map((cfg, idx) => {
    const rGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, 80);
    const rMat = new THREE.MeshBasicMaterial({
      color: idx === 1 ? warmAmber : accent,
      transparent: true,
      opacity: 0.35,
    });
    const rMesh = new THREE.Mesh(rGeo, rMat);
    rMesh.rotation.x = cfg.tiltX;
    rMesh.rotation.z = cfg.tiltZ;
    ringGroup.add(rMesh);
    return { mesh: rMesh, speed: cfg.speed };
  });

  // --------------------------------------------------------------------------
  // 3. Logarithmic Spiral Accretion Particle Field
  // --------------------------------------------------------------------------
  const particlePos = new Float32Array(ACCRETION_PARTICLES * 3);
  const particleCols = new Float32Array(ACCRETION_PARTICLES * 3);
  const particleAngles = new Float32Array(ACCRETION_PARTICLES);
  const particleRadii = new Float32Array(ACCRETION_PARTICLES);
  const particleSpeeds = new Float32Array(ACCRETION_PARTICLES);
  const particleHeights = new Float32Array(ACCRETION_PARTICLES);

  for (let i = 0; i < ACCRETION_PARTICLES; i++) {
    const t = Math.random();
    const r = 0.85 + Math.pow(t, 1.8) * (ACCRETION_RADIUS - 0.85);
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.28 / Math.sqrt(r)) * (0.8 + Math.random() * 0.4);
    const height = (Math.random() - 0.5) * 0.28 * Math.sqrt(r);

    particleRadii[i] = r;
    particleAngles[i] = angle;
    particleSpeeds[i] = speed;
    particleHeights[i] = height;

    particlePos[i * 3] = r * Math.cos(angle);
    particlePos[i * 3 + 1] = height;
    particlePos[i * 3 + 2] = r * Math.sin(angle);

    const lerpVal = Math.min(1, (r - 0.85) / 1.7);
    const col = bright.clone().lerp(accent, lerpVal * 0.75).lerp(warmAmber, Math.random() * 0.3);
    particleCols[i * 3] = col.r;
    particleCols[i * 3 + 1] = col.g;
    particleCols[i * 3 + 2] = col.b;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleCols, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.048,
    map: spriteTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
  });

  const particlePoints = new THREE.Points(particleGeo, particleMat);
  particlePoints.rotation.x = 0.42;
  particlePoints.rotation.z = -0.22;
  rootGroup.add(particlePoints);

  // Set camera default position
  ctx.camera.position.set(0, 0.4, 3.8);
  ctx.camera.lookAt(0, 0, 0);

  // --------------------------------------------------------------------------
  // Animation Loop
  // --------------------------------------------------------------------------
  let elapsed = 0;

  return {
    tick: (t, dt) => {
      elapsed += dt;

      // Rotate core polyhedra in counter-directions
      innerMesh.rotation.x += dt * 0.45;
      innerMesh.rotation.y += dt * 0.65;
      outerMesh.rotation.x -= dt * 0.3;
      outerMesh.rotation.z += dt * 0.4;
      corePoints.rotation.y += dt * 0.25;

      // Pulse core slightly
      const pulseScale = 1.0 + Math.sin(elapsed * 2.2) * 0.04;
      coreGroup.scale.set(pulseScale, pulseScale, pulseScale);

      // Rotate gyroscopic rings
      ringMeshes.forEach(r => {
        r.mesh.rotation.y += dt * r.speed;
      });

      // Update accretion disk particles along orbits
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < ACCRETION_PARTICLES; i++) {
        particleAngles[i] += particleSpeeds[i] * dt;
        const a = particleAngles[i];
        const r = particleRadii[i];
        const h = particleHeights[i] + Math.sin(elapsed * 1.5 + r * 3) * 0.03;

        arr[i * 3] = r * Math.cos(a);
        arr[i * 3 + 1] = h;
        arr[i * 3 + 2] = r * Math.sin(a);
      }
      posAttr.needsUpdate = true;

      // Gentle root group floating drift
      rootGroup.rotation.y = Math.sin(elapsed * 0.15) * 0.2;
      rootGroup.position.y = Math.sin(elapsed * 0.6) * 0.06;
    },

    dispose: () => {
      spriteTexture.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      outerGeo.dispose();
      outerMat.dispose();
      coreGeo.dispose();
      corePointsMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      ringMeshes.forEach(r => {
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
      });
      scene.remove(rootGroup);
    },
  };
};
