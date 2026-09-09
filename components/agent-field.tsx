'use client';

import { useEffect, useRef } from 'react';
import { projects } from '@/lib/portfolio-data';
import type { Object3D } from 'three';

// Distinct geometry per orbiting node so each real project reads as a
// visually distinct "agent" rather than identical repeated shapes.
const NODE_GEOMETRIES = ['octahedron', 'dodecahedron', 'box', 'tetrahedron', 'cylinder', 'icosahedron'] as const;

/**
 * A decorative 3D constellation: a pulsing core plus one orbiting node per
 * real flagship project (using each project's own accent color and a
 * distinct geometry), connected by telemetry beams with traveling photon
 * particles. Glow comes from additive blending + emissive materials + ACES
 * tone mapping — no post-processing composer, so there's no render-target
 * chain that can choke on a not-yet-laid-out container. Mounts lazily and
 * disposes fully on unmount; meant to live only while an overlay with empty
 * space is open, never on the main page bundle/critical path.
 */
export function AgentField({ isLight = false }: { isLight?: boolean }) {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const THREE = await import('three');
      if (cancelled || !el) return;

      // The container's percentage-based size isn't guaranteed to be resolved
      // the instant this effect runs (e.g. mid dialog-open transition).
      let width = el.clientWidth, height = el.clientHeight;
      for (let tries = 0; tries < 10 && (width < 2 || height < 2); tries++) {
        await new Promise(requestAnimationFrame);
        if (cancelled || !el) return;
        width = el.clientWidth;
        height = el.clientHeight;
      }
      if (width < 2 || height < 2) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.012);
      scene.fog.density = 0; // paper background — depth read via scale/opacity, not a fog tint

      const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      el.appendChild(renderer.domElement);

      const group = new THREE.Group();
      group.rotation.x = 0.32;
      scene.add(group);

      // Guarantee the whole formation stays inside the camera frustum without bottom/top clipping
      const maxOrbitRadius = 3.0 + (projects.length - 1) * 0.85;
      const fitGroupScale = () => {
        const w = el.clientWidth;
        const isDesktop = w > 900;
        const halfV = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const halfH = halfV * camera.aspect;

        // Position constellation core toward the open right side on desktop
        group.position.x = isDesktop ? halfH * 0.26 : 0;
        group.position.y = 0;

        const availableHalfExtent = isDesktop ? Math.min(halfV, halfH * 0.72) : Math.min(halfV, halfH);
        const FIT_MARGIN = 0.76;
        group.scale.setScalar(Math.min(1.0, (availableHalfExtent * FIT_MARGIN) / maxOrbitRadius));
      };
      fitGroupScale();

      // --- core: the human / K-R identity, energy-shell + inner glow ---
      const coreColor = new THREE.Color('#e34a39');
      const coreGeo = new THREE.IcosahedronGeometry(0.85, 1);
      const coreMat = new THREE.MeshBasicMaterial({ color: coreColor, wireframe: true, transparent: true, opacity: 0.85, blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      group.add(coreMesh);
      const innerCore = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), new THREE.MeshBasicMaterial({ color: coreColor, transparent: true, opacity: 0.55, blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending }));
      group.add(innerCore);
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.02, 48), new THREE.MeshBasicMaterial({ color: coreColor, side: THREE.DoubleSide, transparent: true, opacity: 0.35, blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending }));
      halo.rotation.x = Math.PI / 2;
      group.add(halo);

      const pointLight = new THREE.PointLight(0xe34a39, 4, 20);
      group.add(pointLight);
      scene.add(new THREE.AmbientLight(0x1a1a1a));

      // --- one orbiting node per real flagship project ---
      const makeGeometry = (kind: (typeof NODE_GEOMETRIES)[number]) => {
        switch (kind) {
          case 'octahedron': return new THREE.OctahedronGeometry(0.34);
          case 'dodecahedron': return new THREE.DodecahedronGeometry(0.34);
          case 'box': return new THREE.BoxGeometry(0.46, 0.46, 0.46);
          case 'tetrahedron': return new THREE.TetrahedronGeometry(0.4);
          case 'cylinder': return new THREE.CylinderGeometry(0.3, 0.3, 0.46, 6);
          default: return new THREE.IcosahedronGeometry(0.34);
        }
      };

      const orbitLines = new THREE.Group();
      group.add(orbitLines);

      const nodes = projects.map((p, i) => {
        const radius = 3.0 + i * 0.85;
        const tiltX = (i % 2 === 0 ? 1 : -1) * (0.18 + i * 0.04);
        const tiltZ = (i % 2 === 0 ? -1 : 1) * (0.12 + i * 0.05);
        const color = new THREE.Color(p.color);
        if (isLight) { const hsl = color.getHSL({ h: 0, s: 0, l: 0 }); color.setHSL(hsl.h, .8, .25); }

        const orbitPts: InstanceType<typeof THREE.Vector3>[] = [];
        for (let s = 0; s <= 96; s++) {
          const a = (s / 96) * Math.PI * 2;
          orbitPts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
        }
        const orbitLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(orbitPts),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.16, blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending }),
        );
        orbitLine.rotation.x = tiltX;
        orbitLine.rotation.z = tiltZ;
        orbitLines.add(orbitLine);

        const nodeGroup = new THREE.Group();
        const geo = makeGeometry(NODE_GEOMETRIES[i % NODE_GEOMETRIES.length]);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.25, emissive: color, emissiveIntensity: 0.5 }));
        nodeGroup.add(mesh);
        const cage = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ color: isLight ? 0x182139 : 0xffffff, wireframe: true, transparent: true, opacity: 0.3 }));
        cage.scale.setScalar(1.18);
        nodeGroup.add(cage);
        group.add(nodeGroup);

        return { nodeGroup, mesh, cage, radius, tiltX, tiltZ, angle: (i / projects.length) * Math.PI * 2, speed: 0.26 + (i % 3) * 0.05, color, pos: new THREE.Vector3() };
      });

      // --- shared beam + traveling-photon buffers (one geometry each, not per-node) ---
      const beamGeo = new THREE.BufferGeometry();
      const beamPositions = new Float32Array(nodes.length * 6);
      beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPositions, 3));
      const beamLines = new THREE.LineSegments(beamGeo, new THREE.LineBasicMaterial({ color: isLight ? 0x182139 : 0xffffff, transparent: true, opacity: 0.22, blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending, vertexColors: false }));
      group.add(beamLines);

      const photonsPerNode = 2;
      const photonCount = nodes.length * photonsPerNode;
      const photonGeo = new THREE.BufferGeometry();
      const photonPos = new Float32Array(photonCount * 3);
      const photonColor = new Float32Array(photonCount * 3);
      const photonProgress = new Float32Array(photonCount);
      const photonNode = new Int16Array(photonCount);
      let pi = 0;
      nodes.forEach((n, ni) => {
        for (let k = 0; k < photonsPerNode; k++) {
          photonProgress[pi] = Math.random();
          photonNode[pi] = ni;
          photonColor[pi * 3] = n.color.r; photonColor[pi * 3 + 1] = n.color.g; photonColor[pi * 3 + 2] = n.color.b;
          pi++;
        }
      });
      photonGeo.setAttribute('position', new THREE.BufferAttribute(photonPos, 3));
      photonGeo.setAttribute('color', new THREE.BufferAttribute(photonColor, 3));
      const photonPoints = new THREE.Points(photonGeo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
      group.add(photonPoints);

      // --- faint ambient dust for depth spanning full viewport ---
      const dustCount = 380;
      const dustGeo = new THREE.BufferGeometry();
      const dustPos = new Float32Array(dustCount * 3);
      for (let d = 0; d < dustCount * 3; d += 3) {
        dustPos[d] = (Math.random() - 0.5) * 36;
        dustPos[d + 1] = (Math.random() - 0.5) * 22;
        dustPos[d + 2] = (Math.random() - 0.5) * 20;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
      group.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x9a9a90, size: 0.045, transparent: true, opacity: 0.35 })));

      let targetRotX = group.rotation.x, targetRotY = 0;
      const onMove = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        targetRotY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.55;
        targetRotX = 0.32 + ((e.clientY - rect.top) / rect.height - 0.5) * 0.22;
      };
      window.addEventListener('pointermove', onMove, { passive: true });

      // --- rocks-avoid-letters: orbiting nodes nudge nearby nav words out of
      // the way, screen-space, then those words ease back once a node drifts
      // off. Skipped entirely under reduced motion.
      const navRoot = el.closest('.overlay-menu');
      const navLinks = !reduceMotion && navRoot
        ? Array.from(navRoot.querySelectorAll<HTMLElement>('.overlay-nav a, .overlay-nav button'))
        : [];
      const navOffsets = navLinks.map(() => ({ x: 0, y: 0 }));
      const worldPos = new THREE.Vector3();
      const PUSH_RADIUS = 150;
      const PUSH_MAX = 42;
      // The core never orbits (it sits at the group origin), so unlike the
      // gems it can't drift away from a word on its own — give it its own,
      // wider push zone so letters always clear out from in front of it too.
      const CORE_PUSH_RADIUS = 220;
      const CORE_PUSH_MAX = 60;

      const clock = new THREE.Clock();
      let raf = 0;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();

        if (!reduceMotion) group.rotation.y += 0.0018;
        group.rotation.x += (targetRotX - group.rotation.x) * 0.03;
        group.rotation.y += (targetRotY - group.rotation.y) * 0.02;

        coreMesh.rotation.y = t * 0.25;
        coreMesh.rotation.x = Math.sin(t * 0.2) * 0.2;
        const pulse = 1 + Math.sin(t * 1.4) * 0.1;
        innerCore.scale.setScalar(pulse);
        halo.scale.setScalar(1 + Math.sin(t * 1.1) * 0.05);

        const beamArr = beamGeo.attributes.position.array as Float32Array;
        nodes.forEach((n, i) => {
          if (!reduceMotion) n.angle += n.speed * 0.012;
          const x0 = Math.cos(n.angle) * n.radius, z0 = Math.sin(n.angle) * n.radius;
          const v = new THREE.Vector3(x0, 0, z0);
          v.applyAxisAngle(new THREE.Vector3(1, 0, 0), n.tiltX);
          v.applyAxisAngle(new THREE.Vector3(0, 0, 1), n.tiltZ);
          n.nodeGroup.position.copy(v);
          n.pos.copy(v);
          n.mesh.rotation.x += 0.012;
          n.mesh.rotation.y += 0.018;
          n.cage.rotation.copy(n.mesh.rotation);

          const b = i * 6;
          beamArr[b] = 0; beamArr[b + 1] = 0; beamArr[b + 2] = 0;
          beamArr[b + 3] = v.x; beamArr[b + 4] = v.y; beamArr[b + 5] = v.z;
        });
        beamGeo.attributes.position.needsUpdate = true;

        if (!reduceMotion) {
          const pArr = photonGeo.attributes.position.array as Float32Array;
          for (let p = 0; p < photonCount; p++) {
            photonProgress[p] += 0.006 + (p % 3) * 0.0025;
            if (photonProgress[p] > 1) photonProgress[p] = 0;
            const target = nodes[photonNode[p]].pos;
            pArr[p * 3] = target.x * photonProgress[p];
            pArr[p * 3 + 1] = target.y * photonProgress[p];
            pArr[p * 3 + 2] = target.z * photonProgress[p];
          }
          photonGeo.attributes.position.needsUpdate = true;
        }

        if (navLinks.length) {
          // scene.updateMatrixWorld only walks the scene graph the camera
          // isn't part of it, so without this its matrixWorldInverse stays
          // the initial identity for the whole first frame. Projecting the
          // core's exact (0,0,0) through that stale matrix divides by zero
          // (w becomes 0), producing a NaN that poisons the eased offset
          // forever after — so this must run before any .project(camera).
          camera.updateMatrixWorld();
          scene.updateMatrixWorld(true);
          const canvasRect = renderer.domElement.getBoundingClientRect();
          const nodeScreen = nodes.map((n) => {
            n.nodeGroup.getWorldPosition(worldPos);
            const ndc = worldPos.project(camera);
            return {
              x: canvasRect.left + (ndc.x * 0.5 + 0.5) * canvasRect.width,
              y: canvasRect.top + (1 - (ndc.y * 0.5 + 0.5)) * canvasRect.height,
              behind: ndc.z > 1,
              radius: PUSH_RADIUS,
              max: PUSH_MAX,
            };
          });
          coreMesh.getWorldPosition(worldPos);
          const coreNdc = worldPos.project(camera);
          const obstacles = [...nodeScreen, {
            x: canvasRect.left + (coreNdc.x * 0.5 + 0.5) * canvasRect.width,
            y: canvasRect.top + (1 - (coreNdc.y * 0.5 + 0.5)) * canvasRect.height,
            behind: coreNdc.z > 1,
            radius: CORE_PUSH_RADIUS,
            max: CORE_PUSH_MAX,
          }];

          navLinks.forEach((linkEl, li) => {
            const r = linkEl.getBoundingClientRect();
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            let pushX = 0, pushY = 0;
            obstacles.forEach((p) => {
              if (p.behind) return;
              const dx = cx - p.x, dy = cy - p.y;
              const dist = Math.hypot(dx, dy);
              if (dist >= p.radius || dist < 0.01) return;
              const strength = 1 - dist / p.radius;
              pushX += (dx / dist) * strength * p.max;
              pushY += (dy / dist) * strength * p.max;
            });
            const mag = Math.hypot(pushX, pushY);
            if (mag > CORE_PUSH_MAX) { pushX = (pushX / mag) * CORE_PUSH_MAX; pushY = (pushY / mag) * CORE_PUSH_MAX; }

            // Illusion: a slow, per-word side-to-side drift layered under the
            // push-away offset, so the nav even idles with a faint sway
            // instead of sitting dead still when no node is nearby.
            const sway = Math.sin(t * 0.8 + li * 1.7) * 7;

            const o = navOffsets[li];
            o.x += (pushX + sway - o.x) * 0.16;
            o.y += (pushY - o.y) * 0.16;
            linkEl.style.transform = (Math.abs(o.x) > 0.05 || Math.abs(o.y) > 0.05)
              ? `translate(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px)`
              : '';
          });
        }

        renderer.render(scene, camera);
      };
      tick();

      const ro = new ResizeObserver(() => {
        if (!el) return;
        const w = el.clientWidth, h = el.clientHeight;
        if (w < 2 || h < 2) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        fitGroupScale();
      });
      ro.observe(el);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onMove);
        navLinks.forEach((linkEl) => { linkEl.style.transform = ''; });
        ro.disconnect();
        scene.traverse((obj: Object3D) => {
          const m = obj as Object3D & { geometry?: { dispose(): void }; material?: { dispose(): void } | { dispose(): void }[] };
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
          else m.material?.dispose();
        });
        renderer.dispose();
        if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [isLight]);

  return <div ref={mount} className="agent-field" aria-hidden="true" />;
}
