import type { SceneBuilder } from '../scene-types';

// ResearchForge's shape, not a generic swarm: a supervisor core plus exactly
// 3 breakaway research channels, each a small team of worker nodes that stays
// separated from the others and reports only back to the core — no
// proximity-based cross-channel mesh like the reference's flocking agents,
// since "parallel channels that don't talk to each other" is the point.
const CLUSTER_COUNT = 3;
const NODES_PER_CLUSTER = 4;
const BREAKAWAY_RADIUS = 4.4;
const RING_RADIUS = 0.95;

export const build: SceneBuilder = (scene, THREE, ctx) => {
  const group = new THREE.Group();
  group.rotation.x = 0.28;
  scene.add(group);

  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const clusterColors = [accent, accent.clone().lerp(ink, 0.5), ink.clone()];

  // Fit the whole formation inside the frustum regardless of container
  // aspect/camera tuning, computed from real numbers rather than a constant
  // that drifts out of sync (see agent-field.tsx for the bug this avoids).
  const maxRadius = BREAKAWAY_RADIUS + RING_RADIUS + 0.7;
  const fitScale = () => {
    const halfV = ctx.camera.position.z * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
    const halfExtent = halfV * Math.min(1, ctx.camera.aspect);
    group.scale.setScalar(Math.min(1, (halfExtent * 0.86) / maxRadius));
  };
  fitScale();

  // --- supervisor core ---
  const coreCage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 1),
    new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.85, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  group.add(coreCage);
  const coreGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 24, 24),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  group.add(coreGlow);
  const coreHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.02, 48),
    new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide, transparent: true, opacity: 0.35, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  coreHalo.rotation.x = Math.PI / 2;
  group.add(coreHalo);

  const keyLight = new THREE.PointLight(accent, 3.2, 22);
  group.add(keyLight);
  group.add(new THREE.AmbientLight(ink, 0.4));

  // --- one hub per breakaway channel, positioned already broken away ---
  const hubGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const hubs = Array.from({ length: CLUSTER_COUNT }, (_, c) => {
    const angle = -Math.PI / 2 + (c * Math.PI * 2) / CLUSTER_COUNT;
    const basePos = new THREE.Vector3(Math.cos(angle) * BREAKAWAY_RADIUS, Math.sin(c * 2.4) * 0.5, Math.sin(angle) * BREAKAWAY_RADIUS);
    const color = clusterColors[c];
    const mesh = new THREE.Mesh(hubGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.95 }));
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.5, 32), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.4, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }));
    halo.rotation.x = Math.PI / 2;
    group.add(mesh, halo);
    return { basePos, pos: basePos.clone(), mesh, halo, phase: c * 2.1 };
  });

  // --- worker nodes: many identical bodies per channel, so one instanced
  // pair (solid + wireframe cage) per cluster rather than a mesh each ---
  const nodeGeoms = [new THREE.OctahedronGeometry(0.26, 0), new THREE.DodecahedronGeometry(0.24, 0), new THREE.IcosahedronGeometry(0.27, 0)];
  const dummy = new THREE.Object3D();
  const AXIS_X = new THREE.Vector3(1, 0, 0);
  const AXIS_Z = new THREE.Vector3(0, 0, 1);

  const clusters = hubs.map((hub, c) => {
    const color = clusterColors[c];
    const geo = nodeGeoms[c % nodeGeoms.length];
    const solid = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.92 }), NODES_PER_CLUSTER);
    const wire = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: ctx.isLight ? ink : 0xffffff, wireframe: true, transparent: true, opacity: 0.3 }), NODES_PER_CLUSTER);
    group.add(solid, wire);
    const nodes = Array.from({ length: NODES_PER_CLUSTER }, (_, n) => ({
      angle: (n / NODES_PER_CLUSTER) * Math.PI * 2 + c * 0.7,
      tiltX: 0.3 + c * 0.15,
      tiltZ: (c % 2 === 0 ? 1 : -1) * 0.22,
      spin: n * 1.3,
      pos: new THREE.Vector3(),
    }));
    return { hub, solid, wire, nodes, orbitSpeed: 0.16 + c * 0.03 };
  });

  // --- beams: core -> hub (reporting for synthesis) and hub -> node
  // (in-channel coordination) — two shared buffers, never one line per pair ---
  const coreBeamPos = new Float32Array(CLUSTER_COUNT * 6);
  const coreBeamCol = new Float32Array(CLUSTER_COUNT * 6);
  const coreBeamGeo = new THREE.BufferGeometry();
  coreBeamGeo.setAttribute('position', new THREE.BufferAttribute(coreBeamPos, 3));
  coreBeamGeo.setAttribute('color', new THREE.BufferAttribute(coreBeamCol, 3));
  const coreBeams = new THREE.LineSegments(coreBeamGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
  group.add(coreBeams);

  const localBeamCount = CLUSTER_COUNT * NODES_PER_CLUSTER;
  const localBeamPos = new Float32Array(localBeamCount * 6);
  const localBeamCol = new Float32Array(localBeamCount * 6);
  const localBeamGeo = new THREE.BufferGeometry();
  localBeamGeo.setAttribute('position', new THREE.BufferAttribute(localBeamPos, 3));
  localBeamGeo.setAttribute('color', new THREE.BufferAttribute(localBeamCol, 3));
  const localBeams = new THREE.LineSegments(localBeamGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
  group.add(localBeams);

  // --- traveling telemetry photons along both beam kinds, one shared buffer ---
  const reportPhotonsPerCluster = 2;
  const photonCount = CLUSTER_COUNT * reportPhotonsPerCluster + localBeamCount;
  const photonGeo = new THREE.BufferGeometry();
  const photonPos = new Float32Array(photonCount * 3);
  const photonCol = new Float32Array(photonCount * 3);
  type Photon = { cluster: number; node: number; progress: number; speed: number; outbound: boolean };
  const photons: Photon[] = [];
  for (let c = 0; c < CLUSTER_COUNT; c++) {
    for (let k = 0; k < reportPhotonsPerCluster; k++) {
      photons.push({ cluster: c, node: -1, progress: Math.random(), speed: 0.25 + Math.random() * 0.15, outbound: k % 2 === 0 });
      const col = clusterColors[c];
      photonCol[photons.length * 3 - 3] = col.r; photonCol[photons.length * 3 - 2] = col.g; photonCol[photons.length * 3 - 1] = col.b;
    }
    for (let n = 0; n < NODES_PER_CLUSTER; n++) {
      photons.push({ cluster: c, node: n, progress: Math.random(), speed: 0.4 + Math.random() * 0.25, outbound: n % 2 === 0 });
      const col = clusterColors[c].clone().multiplyScalar(0.65);
      photonCol[photons.length * 3 - 3] = col.r; photonCol[photons.length * 3 - 2] = col.g; photonCol[photons.length * 3 - 1] = col.b;
    }
  }
  photonGeo.setAttribute('position', new THREE.BufferAttribute(photonPos, 3));
  photonGeo.setAttribute('color', new THREE.BufferAttribute(photonCol, 3));
  const photonPoints = new THREE.Points(photonGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
  group.add(photonPoints);

  // --- faint depth dust, already spread across its full shell at t=0 ---
  const DUST_COUNT = 260;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST_COUNT * 3);
  const dustCol = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    const r = 5 + Math.random() * 5;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    dustPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    dustPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.6;
    dustPos[i * 3 + 2] = r * Math.cos(ph);
    const col = clusterColors[i % CLUSTER_COUNT];
    dustCol[i * 3] = col.r * 0.6; dustCol[i * 3 + 1] = col.g * 0.6; dustCol[i * 3 + 2] = col.b * 0.6;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.45, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }));
  group.add(dust);

  // Positions core/hubs/nodes as a pure function of t so the very first call
  // (t=0, from build) already leaves everything in its settled, fully
  // broken-away pose — tick() just calls this again with a growing t.
  const layout = (t: number) => {
    coreCage.rotation.y = t * 0.2;
    coreCage.rotation.x = Math.sin(t * 0.3) * 0.12;
    coreHalo.scale.setScalar(1 + Math.sin(t * 1.6) * 0.1);

    clusters.forEach(({ hub, solid, wire, nodes, orbitSpeed }, c) => {
      hub.pos.set(hub.basePos.x, hub.basePos.y + Math.sin(t * 0.5 + hub.phase) * 0.2, hub.basePos.z + Math.cos(t * 0.4 + hub.phase) * 0.15);
      hub.mesh.position.copy(hub.pos);
      hub.mesh.rotation.y = t * 0.4 + hub.phase;
      hub.halo.position.copy(hub.pos);

      nodes.forEach((node, n) => {
        const angle = node.angle + t * orbitSpeed;
        const ring = new THREE.Vector3(Math.cos(angle) * RING_RADIUS, 0, Math.sin(angle) * RING_RADIUS);
        ring.applyAxisAngle(AXIS_X, node.tiltX);
        ring.applyAxisAngle(AXIS_Z, node.tiltZ);
        node.pos.copy(hub.pos).add(ring);

        dummy.position.copy(node.pos);
        dummy.rotation.set(t * 0.6 + node.spin, t * 0.8 + node.spin * 1.3, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        solid.setMatrixAt(n, dummy.matrix);
        dummy.scale.setScalar(1.22);
        dummy.updateMatrix();
        wire.setMatrixAt(n, dummy.matrix);
      });
      solid.instanceMatrix.needsUpdate = true;
      wire.instanceMatrix.needsUpdate = true;
    });

    for (let c = 0; c < CLUSTER_COUNT; c++) {
      const hp = clusters[c].hub.pos;
      const b = c * 6;
      coreBeamPos[b] = 0; coreBeamPos[b + 1] = 0; coreBeamPos[b + 2] = 0;
      coreBeamPos[b + 3] = hp.x; coreBeamPos[b + 4] = hp.y; coreBeamPos[b + 5] = hp.z;
      const pulse = 0.35 + 0.55 * ((Math.sin(t * 2 + c * 2) + 1) / 2);
      const col = clusterColors[c];
      coreBeamCol[b] = col.r * pulse; coreBeamCol[b + 1] = col.g * pulse; coreBeamCol[b + 2] = col.b * pulse;
      coreBeamCol[b + 3] = col.r * pulse * 0.5; coreBeamCol[b + 4] = col.g * pulse * 0.5; coreBeamCol[b + 5] = col.b * pulse * 0.5;

      clusters[c].nodes.forEach((node, n) => {
        const idx = (c * NODES_PER_CLUSTER + n) * 6;
        localBeamPos[idx] = hp.x; localBeamPos[idx + 1] = hp.y; localBeamPos[idx + 2] = hp.z;
        localBeamPos[idx + 3] = node.pos.x; localBeamPos[idx + 4] = node.pos.y; localBeamPos[idx + 5] = node.pos.z;
        const lp = 0.25 + 0.5 * ((Math.sin(t * 3 + n + c * 3) + 1) / 2);
        localBeamCol[idx] = col.r * lp; localBeamCol[idx + 1] = col.g * lp; localBeamCol[idx + 2] = col.b * lp;
        localBeamCol[idx + 3] = col.r * lp * 0.4; localBeamCol[idx + 4] = col.g * lp * 0.4; localBeamCol[idx + 5] = col.b * lp * 0.4;
      });
    }
    coreBeamGeo.attributes.position.needsUpdate = true;
    coreBeamGeo.attributes.color.needsUpdate = true;
    localBeamGeo.attributes.position.needsUpdate = true;
    localBeamGeo.attributes.color.needsUpdate = true;
  };
  layout(0);

  const origin = new THREE.Vector3(0, 0, 0);
  const renderPhotons = () => {
    photons.forEach((p, i) => {
      const to = p.node === -1 ? clusters[p.cluster].hub.pos : clusters[p.cluster].nodes[p.node].pos;
      const from = p.node === -1 ? origin : clusters[p.cluster].hub.pos;
      const a = p.outbound ? from : to;
      const b = p.outbound ? to : from;
      photonPos[i * 3] = THREE.MathUtils.lerp(a.x, b.x, p.progress);
      photonPos[i * 3 + 1] = THREE.MathUtils.lerp(a.y, b.y, p.progress);
      photonPos[i * 3 + 2] = THREE.MathUtils.lerp(a.z, b.z, p.progress);
    });
    photonGeo.attributes.position.needsUpdate = true;
  };
  renderPhotons();

  return {
    tick(t, dt) {
      group.rotation.y += dt * 0.05;
      layout(t);
      photons.forEach((p) => {
        p.progress += p.speed * dt;
        if (p.progress >= 1) { p.progress = 0; p.outbound = !p.outbound; }
      });
      renderPhotons();
      dust.rotation.y = t * 0.02;
    },
    onResize() {
      fitScale();
    },
  };
};
