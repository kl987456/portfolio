import type { SceneBuilder } from '../scene-types';

/**
 * 3D Skills Ecosystem scene: An interactive multi-ring orbital lattice where
 * Agentic AI, Core Systems, and Protocols revolve in calibrated harmony around a central core.
 */
export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const bright = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : '#ffffff'), 0.55);

  const group = new THREE.Group();
  scene.add(group);

  // 1. Central Supervisory Core
  const coreGeo = new THREE.IcosahedronGeometry(0.75, 1);
  const coreMat = new THREE.MeshBasicMaterial({
    color: accent,
    wireframe: true,
    transparent: true,
    opacity: 0.7,
    blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  const innerCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 20, 20),
    new THREE.MeshBasicMaterial({
      color: bright,
      transparent: true,
      opacity: 0.5,
      blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    }),
  );
  group.add(innerCore);

  // 2. Three Concentric Orbital Rings
  // Ring 1: Agentic AI (radius 2.2)
  // Ring 2: Production Systems & Backends (radius 3.6)
  // Ring 3: Protocols & Governance (radius 4.9)
  const ringConfigs = [
    { radius: 2.2, tiltX: 0.35, tiltZ: -0.2, count: 4, speed: 0.28, color: accent },
    { radius: 3.6, tiltX: -0.25, tiltZ: 0.3, count: 5, speed: 0.19, color: bright },
    { radius: 4.9, tiltX: 0.15, tiltZ: 0.1, count: 4, speed: 0.12, color: ink.clone().lerp(accent, 0.5) },
  ];

  const orbitalNodes: {
    group: InstanceType<typeof THREE.Group>;
    radius: number;
    tiltX: number;
    tiltZ: number;
    angle: number;
    speed: number;
    mesh: InstanceType<typeof THREE.Mesh>;
  }[] = [];

  ringConfigs.forEach((rc, rIdx) => {
    // Draw orbit path line
    const orbitPts: InstanceType<typeof THREE.Vector3>[] = [];
    for (let s = 0; s <= 72; s++) {
      const a = (s / 72) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(a) * rc.radius, 0, Math.sin(a) * rc.radius));
    }
    const orbitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(orbitPts),
      new THREE.LineBasicMaterial({
        color: rc.color,
        transparent: true,
        opacity: 0.2,
        blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      }),
    );
    orbitLine.rotation.x = rc.tiltX;
    orbitLine.rotation.z = rc.tiltZ;
    group.add(orbitLine);

    // Create orbiting nodes on this ring
    for (let n = 0; n < rc.count; n++) {
      const nodeGroup = new THREE.Group();
      const geo = rIdx === 0
        ? new THREE.TetrahedronGeometry(0.24)
        : rIdx === 1
        ? new THREE.BoxGeometry(0.3, 0.3, 0.3)
        : new THREE.OctahedronGeometry(0.26);

      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: rc.color,
          emissive: rc.color,
          emissiveIntensity: 0.5,
          metalness: 0.6,
          roughness: 0.3,
        }),
      );
      nodeGroup.add(mesh);

      // Outer wireframe cage
      const cage = new THREE.Mesh(
        geo.clone(),
        new THREE.MeshBasicMaterial({
          color: ctx.isLight ? ink : 0xffffff,
          wireframe: true,
          transparent: true,
          opacity: 0.3,
        }),
      );
      cage.scale.setScalar(1.22);
      nodeGroup.add(cage);

      group.add(nodeGroup);

      orbitalNodes.push({
        group: nodeGroup,
        radius: rc.radius,
        tiltX: rc.tiltX,
        tiltZ: rc.tiltZ,
        angle: (n / rc.count) * Math.PI * 2 + rIdx * 0.5,
        speed: rc.speed,
        mesh,
      });
    }
  });

  // 3. Faint ambient star dust
  const dustCount = 180;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let d = 0; d < dustCount * 3; d += 3) {
    dustPos[d] = (Math.random() - 0.5) * 22;
    dustPos[d + 1] = (Math.random() - 0.5) * 14;
    dustPos[d + 2] = (Math.random() - 0.5) * 18;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: bright,
      size: 0.05,
      transparent: true,
      opacity: 0.4,
      blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    }),
  );
  group.add(dust);

  // Lighting
  const pLight = new THREE.PointLight(accent.getHex(), 3.5, 16);
  pLight.position.set(0, 0, 3);
  group.add(pLight);
  group.add(new THREE.AmbientLight(0x222222));

  group.rotation.x = 0.28;

  return {
    tick: (t) => {
      // Rotate core
      coreMesh.rotation.y = t * 0.25;
      coreMesh.rotation.x = Math.sin(t * 0.2) * 0.15;
      const pulse = 1 + Math.sin(t * 1.5) * 0.08;
      innerCore.scale.setScalar(pulse);

      // Move orbital nodes along rings
      orbitalNodes.forEach((node) => {
        node.angle += node.speed * 0.012;
        const x0 = Math.cos(node.angle) * node.radius;
        const z0 = Math.sin(node.angle) * node.radius;

        const v = new THREE.Vector3(x0, 0, z0);
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), node.tiltX);
        v.applyAxisAngle(new THREE.Vector3(0, 0, 1), node.tiltZ);

        node.group.position.copy(v);
        node.mesh.rotation.x += 0.015;
        node.mesh.rotation.y += 0.02;
      });

      // Subtle group sway
      group.rotation.y = Math.sin(t * 0.15) * 0.08;
    },
    dispose: () => {
      dustGeo.dispose();
    },
  };
};
