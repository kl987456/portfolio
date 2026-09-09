import type { SceneBuilder } from '../scene-types';

// Vector clusters = topical document embeddings; the wireframe probe at the
// origin is Atlas's query vector, firing retrieval rays + traveling photons
// at one cluster's top-K nodes, brightening them (the "graded evidence"),
// then re-querying a new cluster on a timer. The glow pulses in on each
// retarget and settles to a steady base so the resting frame (reduced
// motion skips tick entirely) still reads as a live retrieval, not frame
// zero of an intro.
export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);

  const group = new THREE.Group();
  scene.add(group);

  const clusterCenters = [
    new THREE.Vector3(-3.2, 1.3, -1.0),
    new THREE.Vector3(3.4, 1.5, -1.4),
    new THREE.Vector3(-2.6, -1.8, 1.0),
    new THREE.Vector3(2.9, -1.6, 1.2),
    new THREE.Vector3(0, 3.0, -1.9),
    new THREE.Vector3(0, -2.8, -0.7),
  ];
  // Six hue/lightness-shifted tints of accent — no cluster is a bare "ink"
  // shade, since additive blending would render a dark tint nearly invisible.
  const clusterColors = clusterCenters.map((_, i) =>
    accent.clone().offsetHSL((i - 2.5) * 0.045, 0, i % 2 ? 0.05 : -0.05),
  );

  const NODE_COUNT = 400;
  const nodeMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending });
  const instancedNodes = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.09, 0), nodeMat, NODE_COUNT);
  const dummy = new THREE.Object3D();

  const nodePos: InstanceType<typeof THREE.Vector3>[] = [];
  const nodeCluster = new Uint8Array(NODE_COUNT);
  const baseColor = new Float32Array(NODE_COUNT * 3);
  const clusterNodeIndices: number[][] = clusterCenters.map(() => []);

  for (let i = 0; i < NODE_COUNT; i++) {
    const cIdx = Math.floor(Math.random() * clusterCenters.length);
    const spread = 0.55 + Math.random() * 0.35;
    const pos = clusterCenters[cIdx].clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * spread * 2,
      (Math.random() - 0.5) * spread * 1.6,
      (Math.random() - 0.5) * spread * 2,
    ));
    const scale = 0.5 + Math.random() * 0.9;
    dummy.position.copy(pos);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    instancedNodes.setMatrixAt(i, dummy.matrix);

    const col = clusterColors[cIdx].clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
    instancedNodes.setColorAt(i, col);
    baseColor[i * 3] = col.r; baseColor[i * 3 + 1] = col.g; baseColor[i * 3 + 2] = col.b;

    nodePos.push(pos);
    nodeCluster[i] = cIdx;
    clusterNodeIndices[cIdx].push(i);
  }
  instancedNodes.instanceMatrix.needsUpdate = true;
  const instColor = instancedNodes.instanceColor!; // guaranteed by the setColorAt loop above
  instColor.needsUpdate = true;
  group.add(instancedNodes);

  // Intra-cluster edges: sparse sampling of nearby same-cluster pairs only.
  const edgePos: number[] = [];
  const edgeCol: number[] = [];
  for (let i = 0; i < NODE_COUNT; i += 2) {
    for (let j = i + 1; j < NODE_COUNT; j += 4) {
      if (nodeCluster[i] !== nodeCluster[j]) continue;
      if (nodePos[i].distanceTo(nodePos[j]) > 0.85) continue;
      edgePos.push(nodePos[i].x, nodePos[i].y, nodePos[i].z, nodePos[j].x, nodePos[j].y, nodePos[j].z);
      const c = clusterColors[nodeCluster[i]];
      edgeCol.push(c.r * 0.4, c.g * 0.4, c.b * 0.4, c.r * 0.4, c.g * 0.4, c.b * 0.4);
    }
  }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
  edgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(edgeCol, 3));
  group.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending })));

  // Query probe: dark wireframe cage (ink, normal-blended so it reads as
  // linework against the paper) plus an additive accent core.
  const probeMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), new THREE.MeshBasicMaterial({ color: ink, wireframe: true, transparent: true, opacity: 0.55 }));
  group.add(probeMesh);
  const probeCore = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }));
  group.add(probeCore);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.5, 48), new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide, transparent: true, opacity: 0.3, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }));
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  // Retrieval rays + traveling photons: one shared buffer each (MAX_BEAMS slots).
  const MAX_BEAMS = 16;
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_BEAMS * 6), 3));
  const beamMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.5, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending });
  group.add(new THREE.LineSegments(beamGeo, beamMat));

  const photonGeo = new THREE.BufferGeometry();
  photonGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_BEAMS * 3), 3));
  const photonMat = new THREE.PointsMaterial({ color: ctx.isLight ? ink : 0xffffff, size: 0.05, transparent: true, opacity: 0.6, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
  group.add(new THREE.Points(photonGeo, photonMat));

  const beamTargets: (InstanceType<typeof THREE.Vector3> | null)[] = Array.from({ length: MAX_BEAMS }, () => null);
  const photonProgress = new Float32Array(MAX_BEAMS);
  for (let b = 0; b < MAX_BEAMS; b++) photonProgress[b] = b / MAX_BEAMS; // staggered stream at rest, not bunched at 0

  const matchedIndices: number[] = [];
  let activeCluster = 0;
  let flash = 1;

  const setActiveCluster = (idx: number) => {
    for (const ni of matchedIndices) instColor.setXYZ(ni, baseColor[ni * 3], baseColor[ni * 3 + 1], baseColor[ni * 3 + 2]);
    matchedIndices.length = 0;
    const pool = clusterNodeIndices[idx];
    const take = Math.min(MAX_BEAMS, pool.length);
    for (let k = 0; k < take; k++) {
      const ni = pool[k];
      matchedIndices.push(ni);
      beamTargets[k] = nodePos[ni];
      // "Graded" evidence: brighten the matched nodes rather than recolor them.
      instColor.setXYZ(ni, Math.min(1, baseColor[ni * 3] * 1.7 + 0.15), Math.min(1, baseColor[ni * 3 + 1] * 1.7 + 0.15), Math.min(1, baseColor[ni * 3 + 2] * 1.7 + 0.15));
    }
    for (let k = take; k < MAX_BEAMS; k++) beamTargets[k] = null;
    instColor.needsUpdate = true;
    activeCluster = idx;
    flash = 1;
  };

  const writeBeamPositions = () => {
    const arr = beamGeo.attributes.position.array as Float32Array;
    for (let b = 0; b < MAX_BEAMS; b++) {
      const o = b * 6;
      const target = beamTargets[b];
      arr[o] = 0; arr[o + 1] = 0; arr[o + 2] = 0;
      arr[o + 3] = target ? target.x : 0;
      arr[o + 4] = target ? target.y : 0;
      arr[o + 5] = target ? target.z : 0;
    }
    beamGeo.attributes.position.needsUpdate = true;
  };
  const writePhotonPositions = () => {
    const arr = photonGeo.attributes.position.array as Float32Array;
    for (let b = 0; b < MAX_BEAMS; b++) {
      const o = b * 3;
      const target = beamTargets[b];
      if (!target) { arr[o] = 0; arr[o + 1] = 0; arr[o + 2] = 0; continue; }
      const p = photonProgress[b];
      arr[o] = target.x * p; arr[o + 1] = target.y * p; arr[o + 2] = target.z * p;
    }
    photonGeo.attributes.position.needsUpdate = true;
  };

  setActiveCluster(0);
  writeBeamPositions();
  writePhotonPositions();

  // Fit the whole graph inside the camera frustum regardless of container
  // aspect (mirrors agent-field.tsx's fitGroupScale) — cluster scatter reaches
  // at most ~5.3 units from the origin.
  const GRAPH_RADIUS = 5.3;
  const FIT_MARGIN = 0.85;
  const fitScale = () => {
    const halfV = ctx.camera.position.z * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
    const halfH = halfV * ctx.camera.aspect;
    group.scale.setScalar(Math.min(1, (Math.min(halfV, halfH) * FIT_MARGIN) / GRAPH_RADIUS));
  };
  fitScale();

  const RETARGET_INTERVAL = 4.5;
  let retargetTimer = 0;

  return {
    tick(t, dt) {
      group.rotation.y += dt * 0.05;
      probeMesh.rotation.x = t * 0.5;
      probeMesh.rotation.y = t * 0.7;
      probeCore.scale.setScalar(1 + Math.sin(t * 3.2) * 0.1);
      halo.scale.setScalar(1 + Math.sin(t * 1.4) * 0.04);

      // Flash decays fast after each retarget, then holds at a visible base.
      flash *= Math.pow(0.05, dt);
      beamMat.opacity = 0.26 + flash * 0.5;
      photonMat.opacity = 0.35 + flash * 0.5;

      for (let b = 0; b < MAX_BEAMS; b++) {
        if (!beamTargets[b]) continue;
        photonProgress[b] += dt * (0.35 + (b % 4) * 0.07);
        if (photonProgress[b] > 1) photonProgress[b] -= 1;
      }
      writePhotonPositions();

      retargetTimer += dt;
      if (retargetTimer >= RETARGET_INTERVAL) {
        retargetTimer = 0;
        setActiveCluster((activeCluster + 1) % clusterCenters.length);
        writeBeamPositions();
      }
    },
    onResize: fitScale,
  };
};
