import type * as THREE from 'three';
import type { SceneBuilder } from '../../scene-types';

// Two facing energy-vortex spheres: an ordered cyan chakra-swirl on the left,
// a chaotic violet ionic-arc sphere on the right, bridged by converging
// energy arcs that meet at a clash flare in the middle. Pure abstract energy
// geometry — no figure, no wings, no in-canvas text.

const OFFSET_X = 2.3;
const CORE_R = 0.85;

const ARM_COUNT = 5;
const ARM_SAMPLES = 46; // ordered vortex: 5 spiral arms x 46 samples = 230 points
const SHELL_MIN = CORE_R * 1.08;
const SHELL_MAX = CORE_R * 2.15;
const CHAOS_COUNT = 240; // chaotic vortex: scattered sparks, no arm structure

const BOLT_COUNT = 8;
const BOLT_SEGMENTS = 4; // 4 points -> 3 jagged segments per bolt

const ARC_COUNT = 7;
const ARC_SEGMENTS = 12;

interface VortexSide {
  group: THREE.Group;
  cage: THREE.Mesh;
  glow: THREE.Mesh;
  points: THREE.Points;
  spinSpeed: number;
}

export const build: SceneBuilder = (scene, THREE, ctx) => {
  const accent = new THREE.Color(ctx.accent);
  const ink = new THREE.Color(ctx.ink);
  const hsl = { h: 0, s: 0, l: 0 };
  accent.getHSL(hsl);
  // Violet counterpart: hue-rotated off the site accent so the two spheres
  // read as opposing energies rather than two shades of the same blue.
  const violet = new THREE.Color().setHSL((hsl.h + 0.13) % 1, Math.min(1, hsl.s + 0.25), Math.min(0.75, hsl.l + 0.03));
  const cyanBright = accent.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : 0xffffff), 0.55);
  const violetBright = violet.clone().lerp(new THREE.Color(ctx.isLight ? ctx.ink : 0xffffff), 0.5);
  const clash = accent.clone().lerp(violet, 0.5).lerp(new THREE.Color(ctx.isLight ? ctx.ink : 0xffffff), 0.4);

  const stage = new THREE.Group();
  scene.add(stage);

  function buildVortex(side: 1 | -1, color: THREE.Color, bright: THREE.Color, ordered: boolean): VortexSide {
    const group = new THREE.Group();
    group.position.x = side * OFFSET_X;
    stage.add(group);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(CORE_R * 0.55, 24, 24),
      new THREE.MeshBasicMaterial({ color: bright, transparent: true, opacity: 0.6, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
    );
    group.add(glow);

    const cage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(CORE_R, ordered ? 1 : 2),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.85, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
    );
    group.add(cage);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(CORE_R * 1.14, CORE_R * 1.22, 48),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.32, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
    );
    halo.rotation.x = Math.PI / 2.3;
    halo.rotation.y = side * 0.3;
    group.add(halo);

    // Ordered side: particles laid out along spiral arms wrapping the core
    // (reads as a compressed rotating vortex). Chaotic side: scattered on a
    // radius-biased shell (reads as sparking, unstable energy).
    const count = ordered ? ARM_COUNT * ARM_SAMPLES : CHAOS_COUNT;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    if (ordered) {
      let i = 0;
      for (let a = 0; a < ARM_COUNT; a++) {
        const armAngle = (a / ARM_COUNT) * Math.PI * 2;
        for (let s = 0; s < ARM_SAMPLES; s++, i++) {
          const frac = s / ARM_SAMPLES;
          const radius = THREE.MathUtils.lerp(SHELL_MIN, SHELL_MAX, frac);
          const theta = armAngle + frac * Math.PI * 2.4 * side + (Math.random() - 0.5) * 0.12;
          pos[i * 3] = Math.cos(theta) * radius;
          pos[i * 3 + 1] = (Math.random() - 0.5) * (0.2 + frac * 0.6) * CORE_R;
          pos[i * 3 + 2] = Math.sin(theta) * radius;
          const c = Math.random() > 0.7 ? bright : color;
          col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
      }
    } else {
      for (let i = 0; i < count; i++) {
        const radius = SHELL_MIN + Math.pow(Math.random(), 2.4) * (SHELL_MAX - SHELL_MIN);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(1 - 2 * Math.random());
        pos[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
        pos[i * 3 + 1] = Math.cos(phi) * radius * 0.85;
        pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
        const c = Math.random() > 0.6 ? bright : color;
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.05, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    }));
    group.add(points);

    return { group, cage, glow, points, spinSpeed: ordered ? 0.35 : -0.55 };
  }

  const left = buildVortex(-1, accent, cyanBright, true);
  const right = buildVortex(1, violet, violetBright, false);

  // Ionic bolts crackling off the chaotic sphere — recomputed every frame,
  // cheap given the tiny buffer (8 bolts x 3 segments).
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BOLT_COUNT * (BOLT_SEGMENTS - 1) * 2 * 3), 3));
  const bolts = new THREE.LineSegments(boltGeo, new THREE.LineBasicMaterial({
    color: violetBright, transparent: true, opacity: 0.85, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
  }));
  right.group.add(bolts);

  function updateBolts(t: number) {
    const arr = boltGeo.attributes.position.array as Float32Array;
    let p = 0;
    for (let b = 0; b < BOLT_COUNT; b++) {
      const ang = (b / BOLT_COUNT) * Math.PI * 2 + t * 1.4;
      let prevX = 0, prevY = 0, prevZ = 0;
      for (let s = 1; s < BOLT_SEGMENTS; s++) {
        const wobble = s / (BOLT_SEGMENTS - 1);
        const along = wobble * CORE_R * 1.7;
        const nx = Math.cos(ang) * along + (Math.random() - 0.5) * 0.3 * wobble;
        const ny = Math.sin(ang) * along + (Math.random() - 0.5) * 0.3 * wobble;
        const nz = (Math.random() - 0.5) * 0.3 * wobble;
        arr[p++] = prevX; arr[p++] = prevY; arr[p++] = prevZ;
        arr[p++] = nx; arr[p++] = ny; arr[p++] = nz;
        prevX = nx; prevY = ny; prevZ = nz;
      }
    }
    boltGeo.attributes.position.needsUpdate = true;
  }
  updateBolts(0);

  // Converging arcs bridging the two spheres, gradient-colored accent -> violet,
  // built as one LineSegments (not one Line per arc) to keep the draw-call count down.
  const arcBase: number[] = [];
  const arcColor: number[] = [];
  const arcPhase: number[] = [];
  for (let k = 0; k < ARC_COUNT; k++) {
    const yAnchor = (k / (ARC_COUNT - 1) - 0.5) * CORE_R * 1.5;
    const zAnchor = (Math.random() - 0.5) * 0.5;
    const midY = yAnchor * 0.25 + (Math.random() - 0.5) * 0.3;
    const midZ = (Math.random() - 0.5) * 0.7;
    const p0 = new THREE.Vector3(-OFFSET_X + CORE_R * 1.2, yAnchor, zAnchor * 0.4);
    const p1 = new THREE.Vector3(-OFFSET_X * 0.32, midY * 1.3, midZ);
    const p2 = new THREE.Vector3(OFFSET_X * 0.32, midY * 0.7, -midZ * 0.6);
    const p3 = new THREE.Vector3(OFFSET_X - CORE_R * 1.2, yAnchor * 0.55, -zAnchor * 0.4);
    const pts = new THREE.CatmullRomCurve3([p0, p1, p2, p3]).getPoints(ARC_SEGMENTS);
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1];
      arcBase.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const ca = accent.clone().lerp(violet, s / (pts.length - 1));
      const cb = accent.clone().lerp(violet, (s + 1) / (pts.length - 1));
      arcColor.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
      arcPhase.push(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    }
  }
  const arcBaseArr = new Float32Array(arcBase);
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(arcBaseArr.slice(), 3));
  arcGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(arcColor), 3));
  const arcs = new THREE.LineSegments(arcGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.55, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false,
  }));
  stage.add(arcs);

  function updateArcs(t: number) {
    const arr = arcGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < arcPhase.length; i++) {
      arr[i * 3 + 2] = arcBaseArr[i * 3 + 2] + Math.sin(t * 2.4 + arcPhase[i]) * 0.06;
    }
    arcGeo.attributes.position.needsUpdate = true;
  }

  // Clash flare where the two energies meet.
  const flare = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.3, 1),
    new THREE.MeshBasicMaterial({ color: clash, transparent: true, opacity: 0.8, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  stage.add(flare);
  const flareCage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshBasicMaterial({ color: clash, wireframe: true, transparent: true, opacity: 0.5, blending: ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  stage.add(flareCage);

  // Faint ambient dust for depth.
  const DUST_COUNT = 140;
  const dustPos = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 9;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 5;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  stage.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: ink, size: 0.03, transparent: true, opacity: 0.25 })));

  // Fit the whole formation inside the camera frustum regardless of container
  // aspect (same reasoning as agent-field.tsx's fitGroupScale).
  const maxRadius = OFFSET_X + SHELL_MAX;
  const FIT_MARGIN = 0.88;
  const halfV = ctx.camera.position.z * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
  const fitScale = (aspect: number) => {
    const halfExtent = halfV * Math.min(1, aspect);
    stage.scale.setScalar(Math.min(1, (halfExtent * FIT_MARGIN) / maxRadius));
  };
  fitScale(ctx.width / ctx.height);

  return {
    tick(t) {
      left.cage.rotation.y = t * left.spinSpeed;
      left.cage.rotation.x = Math.sin(t * 0.2) * 0.15;
      left.points.rotation.y = t * left.spinSpeed * 0.8;
      left.glow.scale.setScalar(1 + Math.sin(t * 1.6) * 0.08);

      right.cage.rotation.y = t * right.spinSpeed;
      right.cage.rotation.x = Math.cos(t * 0.25) * 0.2;
      right.points.rotation.y = t * right.spinSpeed * 0.9;
      right.points.rotation.z = Math.sin(t * 0.6) * 0.1;
      right.glow.scale.setScalar(1 + Math.cos(t * 1.8) * 0.1);

      const pulse = 1 + Math.sin(t * 2.2) * 0.12;
      flare.scale.setScalar(pulse);
      flareCage.scale.setScalar(pulse * 1.05);
      flareCage.rotation.y = t * 0.6;

      updateBolts(t);
      updateArcs(t);

      stage.rotation.y = Math.sin(t * 0.12) * 0.05;
    },
    onResize(width, height) {
      fitScale(width / height);
    },
  };
};
