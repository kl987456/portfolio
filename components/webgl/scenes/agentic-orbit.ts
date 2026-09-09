import type * as THREE from 'three';
import type { SceneBuilder } from '../scene-types';

// ForgeGuard's actual shape, not the reference's generic 6-agent LLM core:
// 5 pipeline roles (repo analysis -> plan -> patch -> test -> review) orbit a
// center that stands for the human approval gate, not an autonomous brain.
const ROLES = [
  { name: 'Analyst', radius: 3.0, speed: 0.34, tiltX: 0.22, tiltZ: 0.12 },
  { name: 'Planner', radius: 3.85, speed: 0.29, tiltX: -0.28, tiltZ: 0.22 },
  { name: 'Patch', radius: 4.7, speed: 0.25, tiltX: 0.36, tiltZ: -0.18 },
  { name: 'Test', radius: 5.55, speed: 0.21, tiltX: -0.24, tiltZ: -0.3 },
  { name: 'Review', radius: 6.4, speed: 0.18, tiltX: 0.32, tiltZ: 0.16 },
] as const;

interface Agent {
  nodeGroup: THREE.Group;
  mesh: THREE.Mesh;
  cage: THREE.Mesh;
  radius: number;
  tiltX: number;
  tiltZ: number;
  baseAngle: number;
  speed: number;
  pos: THREE.Vector3;
}

const geometryFor = (THREE_NS: typeof THREE, name: string): THREE.BufferGeometry => {
  switch (name) {
    case 'Analyst': return new THREE_NS.OctahedronGeometry(0.4, 0);
    case 'Planner': return new THREE_NS.DodecahedronGeometry(0.4, 0);
    case 'Patch': return new THREE_NS.BoxGeometry(0.52, 0.52, 0.52);
    case 'Test': return new THREE_NS.TetrahedronGeometry(0.46, 0);
    default: return new THREE_NS.IcosahedronGeometry(0.42, 0); // Review
  }
};

export const build: SceneBuilder = (scene, THREE, ctx) => {
  const group = new THREE.Group();
  group.rotation.x = 0.3;
  scene.add(group);

  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const hsl = { h: 0, s: 0, l: 0 };
  accent.getHSL(hsl);
  const complement = new THREE.Color().setHSL((hsl.h + 0.5) % 1, hsl.s, hsl.l);

  // Gradient from accent (automated proposal stages) toward ink (the human
  // stage) as roles near the gate; Test breaks the gradient with a
  // complementary hue since it checks the others' work instead of adding to it.
  const roleColors = [
    accent.clone(),
    accent.clone().lerp(ink, 0.3),
    accent.clone().lerp(ink, 0.55),
    complement.clone().lerp(ink, 0.15),
    ink.clone().lerp(accent, 0.2),
  ];

  // Fit the whole formation inside the frustum regardless of container
  // aspect (same reasoning as agent-field.tsx's fitGroupScale).
  const maxOrbitRadius = ROLES[ROLES.length - 1].radius + 0.9;
  const FIT_MARGIN = 0.86;
  const halfV = ctx.camera.position.z * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
  const fitScale = (aspect: number) => {
    const halfExtent = halfV * Math.min(1, aspect);
    group.scale.setScalar(Math.min(1, (halfExtent * FIT_MARGIN) / maxOrbitRadius));
  };
  fitScale(ctx.width / ctx.height);

  // --- center: the human approval gate, not an LLM core ---
  const gateCage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 1),
    new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.85, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  group.add(gateCage);
  // Solid ink center, not accent — the person deciding, visually distinct
  // from the automated roles orbiting them.
  const gateCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.6, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  group.add(gateCore);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.02, 48),
    new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide, transparent: true, opacity: 0.35, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  halo.rotation.x = Math.PI / 2;
  group.add(halo);
  // Outer boundary every telemetry beam crosses before reaching the gate —
  // the approval threshold, drifting slower and separate from the pulsing halo.
  const boundaryRing = new THREE.Mesh(
    new THREE.RingGeometry(1.28, 1.34, 64),
    new THREE.MeshBasicMaterial({ color: ink, side: THREE.DoubleSide, transparent: true, opacity: 0.35, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  boundaryRing.rotation.x = Math.PI / 2;
  group.add(boundaryRing);

  const keyLight = new THREE.PointLight(accent, 3.2, 22);
  group.add(keyLight);
  group.add(new THREE.AmbientLight(ink, 0.4));

  // --- per-role label sprites: canvas-2D text baked to a CanvasTexture,
  // since TextGeometry needs an external font JSON this repo doesn't ship ---
  const labelTextures: THREE.CanvasTexture[] = [];
  const makeLabel = (text: string): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 96;
    const c = canvas.getContext('2d')!;
    c.font = '700 46px ui-monospace, SFMono-Regular, Menlo, monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = ctx.ink;
    c.fillText(text.toUpperCase(), 160, 48);
    const tex = new THREE.CanvasTexture(canvas);
    labelTextures.push(tex);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(1.5, 0.45, 1);
    sprite.position.y = 0.85;
    return sprite;
  };

  // --- one orbiting node per ForgeGuard pipeline role ---
  const AXIS_X = new THREE.Vector3(1, 0, 0);
  const AXIS_Z = new THREE.Vector3(0, 0, 1);

  const agents: Agent[] = ROLES.map((role, i) => {
    const pts: InstanceType<typeof THREE.Vector3>[] = [];
    for (let s = 0; s <= 96; s++) {
      const a = (s / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * role.radius, 0, Math.sin(a) * role.radius));
    }
    const orbitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: roleColors[i], transparent: true, opacity: 0.16, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
    );
    orbitLine.rotation.x = role.tiltX;
    orbitLine.rotation.z = role.tiltZ;
    group.add(orbitLine);

    const nodeGroup = new THREE.Group();
    const geo = geometryFor(THREE, role.name);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: roleColors[i], metalness: 0.7, roughness: 0.25, emissive: roleColors[i], emissiveIntensity: 0.5 }));
    nodeGroup.add(mesh);
    const cage = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ color: ctx.isLight ? ink : 0xffffff, wireframe: true, transparent: true, opacity: 0.3 }));
    cage.scale.setScalar(1.18);
    nodeGroup.add(cage);
    nodeGroup.add(makeLabel(role.name));
    group.add(nodeGroup);

    return { nodeGroup, mesh, cage, radius: role.radius, tiltX: role.tiltX, tiltZ: role.tiltZ, baseAngle: (i / ROLES.length) * Math.PI * 2, speed: role.speed, pos: new THREE.Vector3() };
  });

  // --- shared telemetry beams (gate -> role), one LineSegments, never one per role ---
  const beamPositions = new Float32Array(agents.length * 6);
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPositions, 3));
  const beamLines = new THREE.LineSegments(beamGeo, new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.28, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }));
  group.add(beamLines);

  // --- shared traveling photons along those beams, one Points draw call ---
  const photonsPerAgent = 3;
  const photonCount = agents.length * photonsPerAgent;
  const photonPos = new Float32Array(photonCount * 3);
  const photonColor = new Float32Array(photonCount * 3);
  const photonAgent = new Int16Array(photonCount);
  const photonSpeed = new Float32Array(photonCount);
  const photonPhase = new Float32Array(photonCount);
  let pi = 0;
  agents.forEach((_, ai) => {
    const col = roleColors[ai];
    for (let k = 0; k < photonsPerAgent; k++) {
      photonAgent[pi] = ai;
      photonSpeed[pi] = 0.3 + Math.random() * 0.25;
      photonPhase[pi] = Math.random();
      photonColor[pi * 3] = col.r; photonColor[pi * 3 + 1] = col.g; photonColor[pi * 3 + 2] = col.b;
      pi++;
    }
  });
  const photonGeo = new THREE.BufferGeometry();
  photonGeo.setAttribute('position', new THREE.BufferAttribute(photonPos, 3));
  photonGeo.setAttribute('color', new THREE.BufferAttribute(photonColor, 3));
  const photonPoints = new THREE.Points(photonGeo, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
  group.add(photonPoints);

  // --- faint ambient dust for depth, already spread at t=0 ---
  const DUST_COUNT = 220;
  const dustPos = new Float32Array(DUST_COUNT * 3);
  for (let d = 0; d < DUST_COUNT * 3; d += 3) {
    dustPos[d] = (Math.random() - 0.5) * 16;
    dustPos[d + 1] = (Math.random() - 0.5) * 10;
    dustPos[d + 2] = (Math.random() - 0.5) * 16;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  group.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: ink, size: 0.04, transparent: true, opacity: 0.3 })));

  // Positions everything as a pure function of t so build's own layout(0)/
  // renderPhotons(0) call already leaves the resting (t=0 / reduced-motion)
  // frame fully settled, not mid orbit-in.
  const layout = (t: number) => {
    gateCage.rotation.y = t * 0.22;
    gateCage.rotation.x = Math.sin(t * 0.2) * 0.15;
    gateCore.scale.setScalar(1 + Math.sin(t * 1.3) * 0.08);
    halo.scale.setScalar(1 + Math.sin(t * 1.05) * 0.04);
    boundaryRing.rotation.z = t * 0.05;

    agents.forEach((agent, i) => {
      const angle = agent.baseAngle + t * agent.speed;
      agent.pos.set(Math.cos(angle) * agent.radius, 0, Math.sin(angle) * agent.radius);
      agent.pos.applyAxisAngle(AXIS_X, agent.tiltX).applyAxisAngle(AXIS_Z, agent.tiltZ);
      agent.nodeGroup.position.copy(agent.pos);
      agent.mesh.rotation.set(t * 0.5 + i, t * 0.7 + i, 0);
      agent.cage.rotation.copy(agent.mesh.rotation);

      const b = i * 6;
      beamPositions[b] = 0; beamPositions[b + 1] = 0; beamPositions[b + 2] = 0;
      beamPositions[b + 3] = agent.pos.x; beamPositions[b + 4] = agent.pos.y; beamPositions[b + 5] = agent.pos.z;
    });
    beamGeo.attributes.position.needsUpdate = true;
  };
  layout(0);

  const renderPhotons = (t: number) => {
    for (let p = 0; p < photonCount; p++) {
      const k = (t * photonSpeed[p] + photonPhase[p]) % 1;
      const target = agents[photonAgent[p]].pos;
      photonPos[p * 3] = target.x * k;
      photonPos[p * 3 + 1] = target.y * k;
      photonPos[p * 3 + 2] = target.z * k;
    }
    photonGeo.attributes.position.needsUpdate = true;
  };
  renderPhotons(0);

  return {
    tick(t, dt) {
      group.rotation.y += dt * 0.05;
      layout(t);
      renderPhotons(t);
    },
    onResize(width, height) {
      fitScale(width / height);
    },
    dispose() {
      labelTextures.forEach((tex) => tex.dispose());
    },
  };
};
