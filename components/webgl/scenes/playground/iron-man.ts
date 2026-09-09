import type * as THREE from 'three';
import type { SceneBuilder } from '../../scene-types';

// Radiating shard burst: one InstancedMesh standing in for the reference's
// six floating repulsor blades — many more of them, thinner, driven by
// shared arrays instead of one mesh each.
const SHARD_COUNT = 90;
const SHARD_MIN_R = 1.9;
const SHARD_MAX_R = 3.4;

// Nanotech dust: settles across its full burst radius at build time (not
// bunched at the core) so a reduced-motion render already reads as mid
// eruption, then keeps radiating outward and recycling back near the core.
const SWARM_COUNT = 1100;
const SWARM_MIN_R = 0.9;
const SWARM_MAX_R = 3.8;

export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const bright = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : '#ffffff'), 0.65);
  const deep = accent.clone().lerp(ink, 0.6);
  const spark = new THREE.Color(ctx.isLight ? ctx.ink : '#ffffff').lerp(accent, 0.2);

  const group = new THREE.Group();
  group.rotation.x = 0.14; // slight tilt so the rings read as ellipses, not a flat coin
  scene.add(group);

  // --- core disc: soft bloom + bright center, layered circles instead of a bloom pass ---
  group.add(new THREE.Mesh(
    new THREE.CircleGeometry(2.05, 40),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.1, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }),
  ));

  const discMat: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.82, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending });
  const disc: THREE.Mesh = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), discMat);
  disc.position.z = 0.01;
  group.add(disc);

  const coreMat: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: bright, transparent: true, opacity: 1, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending });
  const hotCore: THREE.Mesh = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), coreMat);
  hotCore.position.z = 0.02;
  group.add(hotCore);

  // --- concentric accelerator-coil rings; a torus faces the camera by default ---
  const ring0: THREE.Mesh = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.0338, 10, 64), new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.75, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }));
  const ring1: THREE.Mesh = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.0270, 10, 64), new THREE.MeshBasicMaterial({ color: deep, wireframe: true, transparent: true, opacity: 0.65, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }));
  const ring2: THREE.Mesh = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.0203, 10, 64), new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.5, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }));
  group.add(ring0, ring1, ring2);

  group.add(new THREE.Mesh(
    new THREE.RingGeometry(1.55, 1.8, 48),
    new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide, transparent: true, opacity: 0.16, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  ));

  // --- radiating shards, bursting outward past the rings ---
  const shardGeo = new THREE.ConeGeometry(0.045, 0.4, 4);
  const shardMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, vertexColors: true });
  const shards = new THREE.InstancedMesh(shardGeo, shardMat, SHARD_COUNT);
  const shardAngle = new Float32Array(SHARD_COUNT);
  const shardBaseR = new Float32Array(SHARD_COUNT);
  const shardZ = new Float32Array(SHARD_COUNT);
  const shardPhase = new Float32Array(SHARD_COUNT);
  const shardScale = new Float32Array(SHARD_COUNT);

  const m4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const scaleV = new THREE.Vector3();
  const pickTint = () => {
    const r = Math.random();
    return r > 0.85 ? bright : r > 0.55 ? deep : accent;
  };

  for (let i = 0; i < SHARD_COUNT; i++) {
    shardAngle[i] = Math.random() * Math.PI * 2;
    shardBaseR[i] = SHARD_MIN_R + Math.random() * (SHARD_MAX_R - SHARD_MIN_R);
    shardZ[i] = (Math.random() - 0.5) * 0.7;
    shardPhase[i] = Math.random() * Math.PI * 2;
    shardScale[i] = 0.6 + Math.random() * 0.9;

    dir.set(Math.cos(shardAngle[i]), Math.sin(shardAngle[i]), shardZ[i]).normalize();
    pos.copy(dir).multiplyScalar(shardBaseR[i]);
    quat.setFromUnitVectors(up, dir); // cone tip (+Y) points outward along dir
    scaleV.setScalar(shardScale[i]);
    m4.compose(pos, quat, scaleV);
    shards.setMatrixAt(i, m4);
    shards.setColorAt(i, pickTint());
  }
  if (shards.instanceColor) shards.instanceColor.needsUpdate = true;
  group.add(shards);

  // --- nanotech dust swarm: shared buffer, one Points draw call ---
  const swarmGeo = new THREE.BufferGeometry();
  const swarmPos = new Float32Array(SWARM_COUNT * 3);
  const swarmCol = new Float32Array(SWARM_COUNT * 3);
  const swarmAngle = new Float32Array(SWARM_COUNT);
  const swarmR = new Float32Array(SWARM_COUNT);
  const swarmZ = new Float32Array(SWARM_COUNT);
  const swarmSpeed = new Float32Array(SWARM_COUNT);
  const swarmSpin = new Float32Array(SWARM_COUNT);

  const respawn = (i: number, atCore: boolean) => {
    swarmAngle[i] = Math.random() * Math.PI * 2;
    swarmR[i] = atCore ? SWARM_MIN_R + Math.random() * 0.3 : SWARM_MIN_R + Math.random() * (SWARM_MAX_R - SWARM_MIN_R);
    swarmZ[i] = (Math.random() - 0.5) * 1.4;
    swarmSpeed[i] = 0.25 + Math.random() * 0.6;
    swarmSpin[i] = (Math.random() - 0.5) * 0.6;
    const r = Math.random();
    const c = r > 0.8 ? spark : r > 0.55 ? deep : r > 0.3 ? bright : accent;
    swarmCol[i * 3] = c.r; swarmCol[i * 3 + 1] = c.g; swarmCol[i * 3 + 2] = c.b;
  };
  for (let i = 0; i < SWARM_COUNT; i++) {
    respawn(i, false);
    swarmPos[i * 3] = Math.cos(swarmAngle[i]) * swarmR[i];
    swarmPos[i * 3 + 1] = Math.sin(swarmAngle[i]) * swarmR[i];
    swarmPos[i * 3 + 2] = swarmZ[i];
  }

  swarmGeo.setAttribute('position', new THREE.BufferAttribute(swarmPos, 3));
  swarmGeo.setAttribute('color', new THREE.BufferAttribute(swarmCol, 3));
  const swarm = new THREE.Points(swarmGeo, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.85, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
  group.add(swarm);

  // Keep the whole burst inside the camera frustum regardless of container
  // aspect (same reasoning as agent-field.tsx's fitGroupScale).
  const FIT_MARGIN = 0.92;
  const halfV = ctx.camera.position.z * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
  const fitScale = (aspect: number) => {
    const halfExtent = halfV * Math.min(1, aspect);
    group.scale.setScalar(Math.min(1, (halfExtent * FIT_MARGIN) / SWARM_MAX_R));
  };
  fitScale(ctx.width / ctx.height);

  return {
    tick(t) {
      group.rotation.y = Math.sin(t * 0.1) * 0.12;

      ring0.rotation.z = t * 0.5;
      ring1.rotation.z = -t * 0.35;
      ring2.rotation.z = t * 0.2;

      const pulse = Math.sin(t * 5) * 0.15 + 0.85;
      coreMat.opacity = pulse;
      hotCore.scale.setScalar(0.9 + pulse * 0.15);
      discMat.opacity = 0.68 + Math.sin(t * 2.4) * 0.12;

      for (let i = 0; i < SHARD_COUNT; i++) {
        const r = shardBaseR[i] + Math.sin(t * 1.6 + shardPhase[i]) * 0.12;
        dir.set(Math.cos(shardAngle[i]), Math.sin(shardAngle[i]), shardZ[i]).normalize();
        pos.copy(dir).multiplyScalar(r);
        quat.setFromUnitVectors(up, dir);
        scaleV.setScalar(shardScale[i]);
        m4.compose(pos, quat, scaleV);
        shards.setMatrixAt(i, m4);
      }
      shards.instanceMatrix.needsUpdate = true;

      let recolored = false;
      for (let i = 0; i < SWARM_COUNT; i++) {
        swarmAngle[i] += swarmSpin[i] * 0.01;
        swarmR[i] += swarmSpeed[i] * 0.015;
        if (swarmR[i] > SWARM_MAX_R) {
          respawn(i, true);
          recolored = true;
        }
        swarmPos[i * 3] = Math.cos(swarmAngle[i]) * swarmR[i];
        swarmPos[i * 3 + 1] = Math.sin(swarmAngle[i]) * swarmR[i];
        swarmPos[i * 3 + 2] = swarmZ[i];
      }
      swarmGeo.attributes.position.needsUpdate = true;
      if (recolored) swarmGeo.attributes.color.needsUpdate = true;
    },
    onResize(width, height) {
      fitScale(width / height);
    },
  };
};
