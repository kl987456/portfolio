import type { SceneBuilder } from '../scene-types';

/**
 * 3D Spatial Timeline scene: A calibrated engineering data bus running through 3D space,
 * with milestone telemetry nodes, traveling event pulses, and an optical lattice.
 */
export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const bright = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : '#ffffff'), 0.6);

  const group = new THREE.Group();
  scene.add(group);

  // Soft round dot sprite for packet points
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = spriteCanvas.height = 64;
  const sctx = spriteCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 64, 64);
  const sprite = new THREE.CanvasTexture(spriteCanvas);

  // 1. Central bus spline lines (3 parallel optical lines)
  const lineCount = 3;
  const lineGroups: InstanceType<typeof THREE.Line>[] = [];
  const pointsPerLine = 120;

  for (let l = 0; l < lineCount; l++) {
    const pts: InstanceType<typeof THREE.Vector3>[] = [];
    const yOffset = (l - 1) * 0.45;
    const zOffset = (l - 1) * 0.3;

    for (let i = 0; i < pointsPerLine; i++) {
      const t = (i / (pointsPerLine - 1)) * 2 - 1; // -1 to 1
      const x = t * 7;
      const y = Math.sin(t * 2.5 + l * 0.8) * 1.2 + yOffset;
      const z = Math.cos(t * 1.8 + l * 0.5) * 1.5 + zOffset;
      pts.push(new THREE.Vector3(x, y, z));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: l === 1 ? accent : ink.clone().lerp(accent, 0.4),
      transparent: true,
      opacity: l === 1 ? 0.65 : 0.35,
      blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geo, mat);
    group.add(line);
    lineGroups.push(line);
  }

  // 2. Milestone Coordinate Nodes (Terralogic & WhatBytes anchors)
  const milestoneAnchors = [
    { x: -3.2, y: 0.6, z: 0.8, title: 'WhatBytes', color: accent },
    { x: 1.8, y: -0.4, z: -0.4, title: 'Terralogic', color: bright },
  ];

  const nodeMeshes: InstanceType<typeof THREE.Mesh>[] = [];
  const ringMeshes: InstanceType<typeof THREE.Mesh>[] = [];

  milestoneAnchors.forEach((m) => {
    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(m.x, m.y, m.z);

    // Inner octahedron core
    const coreGeo = new THREE.OctahedronGeometry(0.32, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: m.color,
      emissive: m.color,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    nodeGroup.add(coreMesh);
    nodeMeshes.push(coreMesh);

    // Outer orbiting gimbal ring
    const ringGeo = new THREE.RingGeometry(0.55, 0.62, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: m.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    nodeGroup.add(ringMesh);
    ringMeshes.push(ringMesh);

    group.add(nodeGroup);
  });

  // 3. Telemetry Packets traveling along the bus
  const packetCount = 48;
  const packetGeo = new THREE.BufferGeometry();
  const packetPos = new Float32Array(packetCount * 3);
  const packetProgress = new Float32Array(packetCount);
  const packetLine = new Int8Array(packetCount);

  for (let i = 0; i < packetCount; i++) {
    packetProgress[i] = Math.random();
    packetLine[i] = i % lineCount;
  }

  packetGeo.setAttribute('position', new THREE.BufferAttribute(packetPos, 3));
  const packetMat = new THREE.PointsMaterial({
    size: 0.16,
    map: sprite,
    color: bright,
    transparent: true,
    opacity: 0.85,
    blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false,
  });
  const packetPoints = new THREE.Points(packetGeo, packetMat);
  group.add(packetPoints);

  // 4. Subtle background matrix grid
  const gridHelper = new THREE.GridHelper(16, 24, accent, ink);
  gridHelper.position.y = -2.5;
  (gridHelper.material as InstanceType<typeof THREE.Material>).transparent = true;
  (gridHelper.material as InstanceType<typeof THREE.Material>).opacity = 0.12;
  group.add(gridHelper);

  // Lighting
  const pLight = new THREE.PointLight(accent.getHex(), 3, 14);
  pLight.position.set(0, 2, 4);
  group.add(pLight);
  group.add(new THREE.AmbientLight(0x222222));

  // Initial group tilt
  group.rotation.x = 0.2;
  group.rotation.y = -0.15;

  return {
    tick: (t) => {
      // Rotate milestone nodes & rings
      nodeMeshes.forEach((mesh, idx) => {
        mesh.rotation.y = t * 0.4 + idx;
        mesh.rotation.x = Math.sin(t * 0.3 + idx) * 0.2;
      });
      ringMeshes.forEach((ring, idx) => {
        ring.rotation.z = -t * 0.6 + idx;
        ring.rotation.x = Math.PI / 3 + Math.sin(t * 0.5 + idx) * 0.15;
      });

      // Advance packet pulses
      const posArr = packetGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < packetCount; i++) {
        packetProgress[i] += 0.003 + (i % 4) * 0.001;
        if (packetProgress[i] > 1) packetProgress[i] = 0;

        const l = packetLine[i];
        const prog = packetProgress[i];
        const tVal = prog * 2 - 1; // -1 to 1

        const x = tVal * 7;
        const yOffset = (l - 1) * 0.45;
        const zOffset = (l - 1) * 0.3;
        const y = Math.sin(tVal * 2.5 + l * 0.8) * 1.2 + yOffset;
        const z = Math.cos(tVal * 1.8 + l * 0.5) * 1.5 + zOffset;

        posArr[i * 3] = x;
        posArr[i * 3 + 1] = y;
        posArr[i * 3 + 2] = z;
      }
      packetGeo.attributes.position.needsUpdate = true;

      // Subtle breath in group
      group.rotation.y = -0.15 + Math.sin(t * 0.2) * 0.04;
    },
    dispose: () => {
      sprite.dispose();
    },
  };
};
