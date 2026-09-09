import type { SceneBuilder } from '../scene-types';

/**
 * 3D Contact Beacon scene: A minimal futuristic spatial terminal with
 * a central signal beacon, cryptographic coordinate rings, and telemetry pulses.
 */
export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const bright = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : '#ffffff'), 0.65);

  const group = new THREE.Group();
  scene.add(group);

  // 1. Polar telemetry grid rings on ground
  const ringGroup = new THREE.Group();
  ringGroup.position.y = -2.2;
  ringGroup.rotation.x = Math.PI / 2;

  [1.5, 3.0, 4.8, 6.5].forEach((radius, idx) => {
    const geo = new THREE.RingGeometry(radius, radius + 0.02, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: idx === 1 ? accent : ink.clone().lerp(accent, 0.3),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25 - idx * 0.04,
      blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    ringGroup.add(new THREE.Mesh(geo, mat));
  });

  // Crosshairs along ground
  const crossGeo = new THREE.BufferGeometry();
  const crossPts = [
    new THREE.Vector3(-6.5, 0, 0), new THREE.Vector3(6.5, 0, 0),
    new THREE.Vector3(0, -6.5, 0), new THREE.Vector3(0, 6.5, 0),
  ];
  crossGeo.setFromPoints(crossPts);
  const crossMat = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.15,
    blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  ringGroup.add(new THREE.LineSegments(crossGeo, crossMat));
  group.add(ringGroup);

  // 2. Central Beacon Core
  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(0, 0, 0);

  // Diamond beacon
  const diamondGeo = new THREE.OctahedronGeometry(0.55, 0);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.8,
  });
  const diamond = new THREE.Mesh(diamondGeo, diamondMat);
  beaconGroup.add(diamond);

  // Wireframe cage
  const cage = new THREE.Mesh(
    diamondGeo.clone(),
    new THREE.MeshBasicMaterial({
      color: ctx.isLight ? ink : 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    }),
  );
  cage.scale.setScalar(1.25);
  beaconGroup.add(cage);

  // Rotating target rings around the beacon
  const targetRing1 = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 0.92, 48),
    new THREE.MeshBasicMaterial({
      color: bright,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    }),
  );
  beaconGroup.add(targetRing1);

  const targetRing2 = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.2, 48),
    new THREE.MeshBasicMaterial({
      color: accent,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
      blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    }),
  );
  targetRing2.rotation.x = Math.PI / 3;
  beaconGroup.add(targetRing2);

  group.add(beaconGroup);

  // 3. Vertical Signal Beams
  const beamCount = 32;
  const beamGeo = new THREE.BufferGeometry();
  const beamPos = new Float32Array(beamCount * 3);
  for (let b = 0; b < beamCount; b++) {
    beamPos[b * 3] = (Math.random() - 0.5) * 0.4;
    beamPos[b * 3 + 1] = (Math.random() - 0.5) * 6;
    beamPos[b * 3 + 2] = (Math.random() - 0.5) * 0.4;
  }
  beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPos, 3));
  const beamMat = new THREE.PointsMaterial({
    size: 0.08,
    color: bright,
    transparent: true,
    opacity: 0.75,
    blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  const beamPoints = new THREE.Points(beamGeo, beamMat);
  group.add(beamPoints);

  // 4. Subtle ambient telemetry particles
  const dustCount = 140;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let d = 0; d < dustCount * 3; d += 3) {
    dustPos[d] = (Math.random() - 0.5) * 20;
    dustPos[d + 1] = (Math.random() - 0.5) * 12;
    dustPos[d + 2] = (Math.random() - 0.5) * 16;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  group.add(
    new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: bright,
        size: 0.045,
        transparent: true,
        opacity: 0.35,
        blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      }),
    ),
  );

  // Lighting
  const pLight = new THREE.PointLight(accent.getHex(), 4, 15);
  pLight.position.set(0, 1, 3);
  group.add(pLight);
  group.add(new THREE.AmbientLight(0x1a1a1a));

  group.rotation.x = 0.25;

  return {
    tick: (t) => {
      diamond.rotation.y = t * 0.35;
      diamond.rotation.x = Math.sin(t * 0.2) * 0.2;
      cage.rotation.copy(diamond.rotation);

      targetRing1.rotation.z = -t * 0.5;
      targetRing2.rotation.z = t * 0.3;

      // Pulse beacon height
      beaconGroup.position.y = Math.sin(t * 1.2) * 0.15;

      // Vertical pulse animation for beam particles
      const bArr = beamGeo.attributes.position.array as Float32Array;
      for (let b = 0; b < beamCount; b++) {
        bArr[b * 3 + 1] += 0.035;
        if (bArr[b * 3 + 1] > 3) bArr[b * 3 + 1] = -3;
      }
      beamGeo.attributes.position.needsUpdate = true;

      // Rotate ground grid gently
      ringGroup.rotation.z = t * 0.04;
    },
    dispose: () => {
      diamondGeo.dispose();
      dustGeo.dispose();
      beamGeo.dispose();
    },
  };
};
