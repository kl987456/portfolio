'use client';

import { useState, type CSSProperties } from 'react';
import { WebGLHost } from '@/components/webgl/webgl-host';
import { build as neuralSphere } from '@/components/webgl/scenes/neural-sphere';
import { build as agentSwarm } from '@/components/webgl/scenes/agent-swarm';
import { build as neuralTunnel } from '@/components/webgl/scenes/neural-tunnel';
import { build as brainMesh } from '@/components/webgl/scenes/brain-mesh';
import { build as agenticOrbit } from '@/components/webgl/scenes/agentic-orbit';
import { build as dataRiver } from '@/components/webgl/scenes/data-river';
import { build as ragGraph } from '@/components/webgl/scenes/rag-graph';
import { build as rasenganChidori } from '@/components/webgl/scenes/playground/rasengan-chidori';
import { build as ironMan } from '@/components/webgl/scenes/playground/iron-man';
import { build as thor } from '@/components/webgl/scenes/playground/thor';
import type { SceneBuilder } from '@/components/webgl/scene-types';

export interface SystemSceneSpec {
  id: string;
  number: string;
  name: string;
  category: string;
  description: string;
  topology: string;
  nodes: string;
  projectSlug?: string;
  projectName?: string;
  accent: string;
  ink: string;
  build: SceneBuilder;
}

export const ALL_3D_SYSTEMS: SystemSceneSpec[] = [
  {
    id: 'neural-sphere',
    number: '01',
    name: 'AI Neural Sphere',
    category: 'ASYNC EVENT RECONCILIATION',
    description: 'Dense Fibonacci lattice core with non-coplanar geodesic orbits and travelling radial pulse waves. Models multi-agent voice event streams converging into a unified state record.',
    topology: 'Fibonacci Geodesic Lattice',
    nodes: '650 Core Nodes · 3 Orbital Bands',
    projectSlug: 'workforce-ai',
    projectName: 'Workforce AI',
    accent: '#ff5500',
    ink: '#ff8400',
    build: neuralSphere,
  },
  {
    id: 'agent-swarm',
    number: '02',
    name: 'AI Agent Swarm',
    category: 'PARALLEL SPECIALIST DEPLOYMENT',
    description: 'Dynamic cluster-breakaway multi-agent geometry with active communication beams. Parallel research agents gather, challenge, and synthesize hypotheses back to a central supervisor.',
    topology: 'Cluster-Breakaway Mesh',
    nodes: '3 Parallel Channels · 1 Supervisor',
    projectSlug: 'researchforge',
    projectName: 'ResearchForge',
    accent: '#ff5500',
    ink: '#ff8400',
    build: agentSwarm,
  },
  {
    id: 'neural-tunnel',
    number: '03',
    name: 'Neural Network Tunnel',
    category: 'DEEP LATENT HIGHWAY',
    description: 'Endless non-linear curving deep neural tunnel with synapsing layer rings. Represents continuous forward model inference and high-throughput vector transformations.',
    topology: 'Continuous Catmull-Rom Spline',
    nodes: '160 Layer Rings · Dynamic Synapses',
    accent: '#ff5500',
    ink: '#111418',
    build: neuralTunnel,
  },
  {
    id: 'brain-mesh',
    number: '04',
    name: 'Computational Brain Mesh',
    category: 'DUAL-HEMISPHERE REASONING',
    description: 'Dual-hemisphere point-cloud brain with travelling activation waves. Symbolizes the synergy between human architectural intent and autonomous agent reasoning loops.',
    topology: 'Dual-Hemisphere Point Cloud',
    nodes: '1,200 Synaptic Nodes · Wave Packets',
    accent: '#ff5500',
    ink: '#ff8400',
    build: brainMesh,
  },
  {
    id: 'agentic-orbit',
    number: '05',
    name: 'Agentic Orbit & Human Gate',
    category: 'HIERARCHICAL GOVERNANCE',
    description: 'Central human approval gate orbited by 5 non-coplanar specialist agents (Analyst, Planner, Patch, Test, Review). Guarantees safety and verification before autonomous deployment.',
    topology: 'Non-Coplanar Multi-Axis Orbit',
    nodes: '5 Engineering Roles · 1 Central Gate',
    projectSlug: 'forgeguard',
    projectName: 'ForgeGuard',
    accent: '#ff5500',
    ink: '#ff3700',
    build: agenticOrbit,
  },
  {
    id: 'data-river',
    number: '06',
    name: 'AI Data Stream River',
    category: 'QUERY-TO-EVIDENCE PIPELINE',
    description: 'Braided spline particle ribbons with variable velocities and fluid branching. Visualizes natural language converting into validated SQL and streaming evidence rows in real time.',
    topology: 'Braided Multi-Strand Spline',
    nodes: '4 Particle Ribbons · Branching Vectors',
    projectSlug: 'aperture',
    projectName: 'Aperture',
    accent: '#ff5500',
    ink: '#ffaa00',
    build: dataRiver,
  },
  {
    id: 'rag-graph',
    number: '07',
    name: 'RAG Knowledge Graph',
    category: 'VECTOR CITATION & RETRIEVAL',
    description: '3D vector document embedding clusters with animated query probe and retrieval rays. Demonstrates citation-first retrieval that grades its own evidence before synthesis.',
    topology: 'High-Dimensional Vector Clusters',
    nodes: '400 Embeddings · 6 Semantic Clusters',
    projectSlug: 'atlas',
    projectName: 'Atlas',
    accent: '#ff5500',
    ink: '#ff8400',
    build: ragGraph,
  },
  {
    id: 'rasengan-chidori',
    number: '08',
    name: 'Vortex Energy Clash',
    category: 'KINETIC ENERGY DYNAMICS',
    description: 'Two rival high-velocity energy vortices facing off in continuous kinetic collision with dynamic particle shockwaves and field distortion.',
    topology: 'Dual Counter-Rotating Vortices',
    nodes: '3,000 High-Velocity Energy Particles',
    accent: '#ff5500',
    ink: '#ff8400',
    build: rasenganChidori,
  },
  {
    id: 'iron-man',
    number: '09',
    name: 'Arc Reactor Nanotech',
    category: 'NANOTECH CELLULAR ASSEMBLY',
    description: 'Radial energy-core disc bursting into dynamic nanotech shards and reconstituting under magnetic containment. A study in mechanical precision and explosive dissipation.',
    topology: 'Radial Core & Geometric Shards',
    nodes: 'Arc Reactor Core · Floating Nanites',
    accent: '#ff5500',
    ink: '#ff8400',
    build: ironMan,
  },
  {
    id: 'thor',
    number: '10',
    name: 'Bifrost Lightning Apex',
    category: 'ATMOSPHERIC PLASMA DYNAMICS',
    description: 'Branching procedural lightning bolts dancing around a swirling portal vortex, evoking cosmic energy channels and dimensional bridging.',
    topology: 'Procedural Branching Lightning Beams',
    nodes: 'Multi-Segment Plasma Arcs · Bifrost Core',
    accent: '#ff5500',
    ink: '#ffaa00',
    build: thor,
  },
];

export function ThreeSystemsLab({
  onSelectProject,
}: {
  onSelectProject?: (slug: string) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const current = ALL_3D_SYSTEMS[selectedIndex];

  const prevScene = () => {
    setSelectedIndex((idx) => (idx === 0 ? ALL_3D_SYSTEMS.length - 1 : idx - 1));
  };

  const nextScene = () => {
    setSelectedIndex((idx) => (idx === ALL_3D_SYSTEMS.length - 1 ? 0 : idx + 1));
  };

  return (
    <div className="systems-lab-container">
      {/* 3D System Header */}
      <header className="systems-lab-header">
        <div className="systems-header-meta">
          <span className="eyebrow">3D SYSTEM ARCHITECTURES</span>
          <h1 className="systems-title">
            {current.number} <span className="systems-title-sep">/</span> {current.name}
          </h1>
          <p className="systems-desc">{current.description}</p>
        </div>

        <div className="systems-header-stats">
          <div className="stat-pill">
            <span className="stat-label">TOPOLOGY</span>
            <strong className="stat-val">{current.topology}</strong>
          </div>
          <div className="stat-pill">
            <span className="stat-label">STRUCTURE</span>
            <strong className="stat-val">{current.nodes}</strong>
          </div>
        </div>
      </header>

      {/* Main 3D Canvas Stage */}
      <div className="systems-stage-wrapper">
        <div className="systems-stage" key={current.id}>
          <WebGLHost
            build={current.build}
            accent={current.accent}
            ink={current.ink}
            interactive={true}
          />

          {/* Interactive HUD Overlay */}
          <div className="systems-hud" aria-hidden="true">
            <div className="hud-corner hud-top-left">
              <span className="hud-label">ARCHITECTURE DOMAIN</span>
              <strong className="hud-value">{current.category}</strong>
            </div>

            <div className="hud-corner hud-bottom-left">
              <div className="hud-hint">
                <span className="hud-icon">✥</span>
                <span>DRAG TO ROTATE 360° · DOUBLE-CLICK TO RESET</span>
              </div>
            </div>

            <div className="hud-corner hud-bottom-right">
              {current.projectSlug && (
                <button
                  type="button"
                  className="hud-project-jump"
                  onClick={() => onSelectProject?.(current.projectSlug!)}
                >
                  <span>PROJECT APPLICATION:</span>
                  <strong>{current.projectName} ↗</strong>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Arrow Controls */}
          <button
            type="button"
            className="systems-nav-arrow arrow-prev"
            aria-label="Previous 3D scene"
            onClick={prevScene}
          >
            ←
          </button>
          <button
            type="button"
            className="systems-nav-arrow arrow-next"
            aria-label="Next 3D scene"
            onClick={nextScene}
          >
            →
          </button>
        </div>
      </div>

      {/* System Selector Ribbon */}
      <nav className="systems-ribbon" aria-label="3D system scenes">
        {ALL_3D_SYSTEMS.map((sys, idx) => {
          const isCurrent = idx === selectedIndex;
          return (
            <button
              key={sys.id}
              type="button"
              className={`systems-ribbon-item ${isCurrent ? 'active' : ''}`}
              onClick={() => setSelectedIndex(idx)}
              style={{
                '--scene-accent': sys.accent,
                '--scene-ink': sys.ink,
              } as CSSProperties}
            >
              <div className="ribbon-item-num">{sys.number}</div>
              <div className="ribbon-item-content">
                <strong>{sys.name}</strong>
                <small>{sys.category}</small>
              </div>
              {isCurrent && <span className="ribbon-active-indicator" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
