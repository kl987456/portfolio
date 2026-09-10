'use client';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { HeroName, VisionLabels, AmbientTerminal } from '@/components/portfolio-upgrades';
import { AgentWalkthrough } from '@/components/agent-walkthrough';
import {
  gallery,
  otherWork,
  profile,
  projects,
  type Project,
} from '@/lib/portfolio-data';
import {
  createPortfolioAudio,
  type PortfolioAudio,
} from '@/lib/portfolio-audio';
import { WebGLHost } from '@/components/webgl/webgl-host';
import { PROJECT_SCENE } from '@/components/webgl/project-scene-map';
import { PLAYGROUND_SCENE } from '@/components/webgl/playground-scene-map';
import { build as brainMesh } from '@/components/webgl/scenes/brain-mesh';
import { build as neuralTunnel } from '@/components/webgl/scenes/neural-tunnel';
import { build as introSingularity } from '@/components/webgl/scenes/intro-singularity';
import { build as spatialTimeline } from '@/components/webgl/scenes/spatial-timeline';
import { build as skillsEcosystem } from '@/components/webgl/scenes/skills-ecosystem';
import { build as contactBeacon } from '@/components/webgl/scenes/contact-beacon';
import { InteractiveArchitecture } from '@/components/interactive-architecture';

const PROJECT_3D_SPECS: Record<
  string,
  {
    tag: string;
    nodes: string;
    topology: string;
    focus: string;
    runtime: string;
  }
> = {
  atlas: {
    tag: 'RETRIEVAL CLUSTERS & QUERY PROBE',
    nodes: '400 Embeddings · 6 Clusters',
    topology: 'Vector Top-K Raycast',
    focus: 'Relevance Grading & Citation Rays',
    runtime: 'RAGAS Evaluated · pgvector Engine',
  },
  researchforge: {
    tag: 'SUPERVISOR & PARALLEL SPECIALISTS',
    nodes: '3 Parallel Channels · 1 Supervisor',
    topology: 'Cluster Breakaway Mesh',
    focus: 'Live Telemetry & Synthesis Beams',
    runtime: 'Async Python · Multi-Channel Bus',
  },
  forgeguard: {
    tag: 'HUMAN APPROVAL GATE & PIPELINE ORBIT',
    nodes: '5 Engineering Roles · 1 Central Gate',
    topology: 'Non-Coplanar Elliptical Orbit',
    focus: 'Analyst, Planner, Patch, Test, Review',
    runtime: 'JWT Protected · Human-in-the-Loop',
  },
  aperture: {
    tag: 'QUERY-TO-EVIDENCE BRAIDED RIVER',
    nodes: '3 Spline Ribbons · 500 Row Buffer',
    topology: 'Fluid Spline Branching',
    focus: 'SQL Parsing & Evidence Flow',
    runtime: 'SQLGlot AST · Traced Analytics',
  },
  'workforce-ai': {
    tag: 'FIBONACCI LATTICE & VOICE EVENT RINGS',
    nodes: '650 Core Nodes · 3 Geodesic Rings',
    topology: 'Spherical Golden Spiral',
    focus: 'Asynchronous Voice Reconciliation',
    runtime: 'HMAC-SHA256 · 8 Rule Automations',
  },
};

export const PROJECT_THEME_COLORS: Record<
  'dark' | 'white',
  Record<string, { color: string; ink: string; accent: string }>
> = {
  dark: {
    'workforce-ai': { color: '#c8eb66', ink: '#1c281c', accent: '#c8eb66' },
    forgeguard: { color: '#ee633f', ink: '#25130d', accent: '#ee633f' },
    aperture: { color: '#9eafda', ink: '#182139', accent: '#9eafda' },
    researchforge: { color: '#d4c1e5', ink: '#32223d', accent: '#d4c1e5' },
    atlas: { color: '#f2c94c', ink: '#2b2107', accent: '#f2c94c' },
  },
  white: {
    'workforce-ai': { color: '#0d7a3e', ink: '#ffffff', accent: '#15803d' },
    forgeguard: { color: '#c2410c', ink: '#ffffff', accent: '#ea580c' },
    aperture: { color: '#1d4ed8', ink: '#ffffff', accent: '#2563eb' },
    researchforge: { color: '#7e22ce', ink: '#ffffff', accent: '#9333ea' },
    atlas: { color: '#b45309', ink: '#ffffff', accent: '#d97706' },
  },
};

const AgentField = lazy(() =>
  import('@/components/agent-field').then((m) => ({ default: m.AgentField })),
);

export const SCREENS = [
  { id: 'home', number: '01', title: 'HOME', label: 'SYSTEM COGNITION' },
  { id: 'vision', number: '02', title: 'VISION', label: 'HUMAN IN THE LOOP' },
  { id: 'about', number: '03', title: 'ABOUT', label: 'AUTONOMOUS ARCHITECTURE' },
  { id: 'work', number: '04', title: 'WORK', label: 'FLAGSHIP AGENT SYSTEMS' },
  { id: 'experience', number: '05', title: 'EXPERIENCE', label: 'PRODUCTION TELEMETRY' },
  { id: 'skills', number: '06', title: 'SKILLS', label: 'TECHNICAL ECOSYSTEM' },
  { id: 'playground', number: '07', title: 'PLAYGROUND', label: 'KINETIC LAB & ARCHIVES' },
  { id: 'contact', number: '08', title: 'CONTACT', label: 'DIRECT DISPATCH' },
] as const;

type ScreenId = typeof SCREENS[number]['id'];
type View = 'home' | 'work' | 'systems' | 'about' | 'playground' | 'project' | 'experience' | 'skills' | 'contact' | 'vision';
type Overlay = 'menu' | 'contact' | 'process' | 'reel' | null;

const pad = (n: number) => String(n).padStart(2, '0');
const wrap = (n: number, length: number) => ((n % length) + length) % length;

function RollingText({ children }: { children: ReactNode }) {
  return (
    <span className="roll-label">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  );
}

function External({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-link ${className}`}
    >
      <RollingText>{children}</RollingText>
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function SystemMap({
  project,
  compact = false,
}: {
  project: Project;
  compact?: boolean;
}) {
  const research = project.slug === 'researchforge';
  return (
    <div
      className={`system-map ${compact ? 'compact' : ''}`}
      aria-label={`${project.name} workflow: ${project.flow.join(' to ')}`}
    >
      <svg
        viewBox="0 0 600 260"
        role="img"
        aria-label={
          research
            ? 'Supervisor routing to three parallel research channels, followed by evidence filtering and synthesis'
            : 'Five connected workflow stages'
        }
      >
        {research ? (
          <>
            <path
              className="map-wire"
              d="M80 130H165V50H290M165 130H290M165 130V210H290M310 50H380V130H440M310 130H440M310 210H380V130H460 130H550"
            />
            {[
              ['WEB', 300, 50],
              ['DOCS', 300, 130],
              ['DATA', 300, 210],
              ['SUPERVISOR', 80, 130],
              ['FILTER', 450, 130],
              ['REPORT', 555, 130],
            ].map(([name, x, y], i) => (
              <g
                key={name}
                className="map-node"
                style={{ animationDelay: `${i * 0.3}s` }}
              >
                <circle cx={x} cy={y} r={name === 'SUPERVISOR' ? 30 : 24} />
                <text x={x} y={Number(y) + 45}>
                  {name}
                </text>
              </g>
            ))}
          </>
        ) : (
          <>
            <path className="map-wire" d="M55 120H545" />
            {project.flow.map((name, i) => (
              <g
                key={name}
                className="map-node"
                style={{ animationDelay: `${i * 0.35}s` }}
              >
                <circle cx={55 + i * 122} cy={120} r={i === 2 ? 32 : 23} />
                <text x={55 + i * 122} y={126} className="node-number">
                  {pad(i + 1)}
                </text>
                <text x={55 + i * 122} y={184}>
                  {name.split(' ').slice(0, 2).join(' ')}
                </text>
              </g>
            ))}
          </>
        )}
      </svg>
    </div>
  );
}

function ProjectArtwork({
  project,
  theme = 'dark',
  detail = false,
}: {
  project: Project;
  theme?: 'dark' | 'white';
  detail?: boolean;
}) {
  const currentTheme = theme === 'white' ? 'white' : 'dark';
  const spec =
    PROJECT_THEME_COLORS[currentTheme][project.slug] ?? {
      color: project.color,
      ink: project.ink,
    };
  return (
    <div
      className={`project-art art-${project.slug} ${detail ? 'detail-art' : ''}`}
      style={
        {
          '--project': spec.color,
          '--project-ink': spec.ink,
        } as CSSProperties
      }
    >
      <div className="art-top">
        <span>K/R — SYSTEM {pad(projects.indexOf(project) + 1)}</span>
        <span>ARCHITECTURE STUDY ↗</span>
      </div>
      <h2>
        {project.name}
        <span>®</span>
      </h2>
      <SystemMap project={project} />
      <div className="art-bottom">
        <span>{project.category}</span>
        <strong>
          {project.slug === 'forgeguard'
            ? 'HUMAN APPROVAL'
            : project.slug === 'aperture'
            ? 'QUERY → EVIDENCE'
            : project.slug === 'researchforge'
            ? 'PARALLEL → SYNTHESIS'
            : project.slug === 'atlas'
            ? 'RETRIEVE → CITE'
            : 'VOICE → WORKFLOW'}
        </strong>
      </div>
    </div>
  );
}

function ProjectCover({
  project,
  reel = false,
}: {
  project: Project;
  reel?: boolean;
}) {
  return (
    <div
      className={`project-cover ${reel ? 'project-cover-reel' : ''}`}
      style={{ '--scene-color': project.color } as CSSProperties}
    >
      <img
        src={project.image}
        alt={`${project.name} multi-agent system artwork`}
      />
      <div className="project-cover-shade" aria-hidden="true" />
      <div className="project-cover-copy">
        <small>{project.category}</small>
        <h2>{project.name}</h2>
        <p>{project.headline}</p>
      </div>
      <div className="project-cover-flow" aria-hidden="true">
        {project.flow.map((_, i) => (
          <i key={i} style={{ animationDelay: `${i * -0.45}s` }} />
        ))}
      </div>
    </div>
  );
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ01234!@#$%&*?✦✧✴✳◆';

function ScrambleLetter({
  char,
  delay,
  active,
}: {
  char: string;
  delay: number;
  active: boolean;
}) {
  const [display, setDisplay] = useState(char === ' ' ? ' ' : GLYPHS[0]);
  const [locked, setLocked] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!active || char === ' ') {
      setDisplay(char);
      setLocked(true);
      return;
    }
    setDisplay(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
    setLocked(false);

    const timer = setTimeout(() => {
      const SCRAMBLE_DURATION = 260;
      startRef.current = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        if (elapsed >= SCRAMBLE_DURATION) {
          setDisplay(char);
          setLocked(true);
          return;
        }
        setDisplay(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, char, delay]);

  return (
    <span
      className={`scramble-char ${locked ? 'scramble-locked' : 'scramble-live'}`}
      aria-hidden="true"
    >
      {display}
    </span>
  );
}

function ScrambleText({
  text,
  active,
  className = '',
}: {
  text: string;
  active: boolean;
  className?: string;
}) {
  return (
    <span className={`scramble-word ${className}`} aria-label={text}>
      {text.split('').map((char, i) => (
        <ScrambleLetter
          key={i}
          char={char}
          delay={i * 22}
          active={active}
        />
      ))}
    </span>
  );
}

function Reveal({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('revealed');
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={style}>
      {children}
    </div>
  );
}

// Animated counter that counts 0 → target when active
function CountUp({ target, suffix = '', active }: { target: number; suffix?: string; active: boolean }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setCount(0); return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setCount(target); return; }
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * target));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, target]);

  return <>{count}{suffix}</>;
}

const METHODOLOGY_PHASES = [
  {
    phase: 'P01',
    category: 'SPECIFICATION',
    cluster: 'SPEC',
    title: 'Topology & Deterministic Contracts',
    rule: 'Enforce deterministic schema contracts before choosing agent topologies.',
    summary: 'Define explicit input/output boundaries, typed message envelopes, and latency SLA budgets across all agent boundaries.',
    rationale: 'Uncontrolled schemas cause silent runtime failures in multi-hop chains. We enforce Pydantic v2 schemas at every boundary, rejecting untyped JSON and ensuring 100% deterministic state transitions.',
    guardrails: [
      'Pydantic v2 typed state schemas for all agent envelopes',
      'Zero untyped dictionary mutations across node boundaries',
      'Hard SLA latency budget ceiling: <180ms per routing hop',
    ],
    tools: ['FastAPI', 'Pydantic v2', 'OpenAPI 3.1', 'JSON-Schema DAG'],
    status: 'VERIFIED // DETERMINISTIC',
    color: '#ff5500',
  },
  {
    phase: 'P02',
    category: 'GOVERNANCE',
    cluster: 'SPEC',
    title: 'Capability Gates & Human-in-the-Loop',
    rule: 'Strict tool isolation; no destructive actions executed without human cryptographic sign-off.',
    summary: 'Compartmentalize agent capabilities into read, propose, and execute tiers with mandatory human escalation on high-impact actions.',
    rationale: 'Agents must never possess unchecked execution privileges. Destructive operations (database writes, financial transactions, external communications) require explicit human sign-off via asynchronous webhooks.',
    guardrails: [
      'AST SQL & shell command sanitizer preventing prompt injection',
      'Granular RBAC tool tokens scoped to specific task lifetimes',
      'Two-party asynchronous human approval webhook gates',
    ],
    tools: ['LangChain Boundaries', 'mTLS / JWT', 'AST Parser', 'Webhook Approval'],
    status: 'PASS // BLAST RADIUS ZERO',
    color: '#ff8800',
  },
  {
    phase: 'P03',
    category: 'ORCHESTRATION',
    cluster: 'ORCH',
    title: 'Stateful Graphs & Checkpoint Replay',
    rule: 'Every agent step must be fully serializable, checkpointed, and replayable.',
    summary: 'Model multi-agent workflows as state graphs with PostgreSQL/Redis checkpointing at every transition for forensic replayability.',
    rationale: 'Distributed agents fail nondeterministically without persistent state. By saving complete graph snapshots at each node hop, failed runs can be replayed, inspected, and resumed without re-running upstream steps.',
    guardrails: [
      'Sub-50ms node state snapshotting in Redis & Postgres',
      'Idempotent task execution IDs preventing duplicate actions',
      'Exponential backoff with jitter on transient upstream 5xx errors',
    ],
    tools: ['LangGraph', 'Redis Streams', 'PostgreSQL Checkpoints', 'Kafka Events'],
    status: 'ACTIVE // STATE PERSISTED',
    color: '#ffaa00',
  },
  {
    phase: 'P04',
    category: 'RETRIEVAL',
    cluster: 'ORCH',
    title: 'Adaptive Hybrid RAG & Provenance',
    rule: 'Never rely on raw vector similarity; enforce hybrid dense+sparse retrieval with semantic reranking.',
    summary: 'Dual-path dense vector + BM25 sparse search fused with cross-encoder rerankers and strict chunk-level citation provenance.',
    rationale: 'Vanilla vector search fails on keyword exactness and domain acronyms. Hybrid retrieval combined with Reciprocal Rank Fusion (RRF) and FlashRank cross-encoders ensures only relevant, cited context reaches the generator.',
    guardrails: [
      'Precision@K > 94% on domain-specific test queries',
      'Citation provenance verification gate before synthesis',
      'Strict token context budget bounds preventing truncation',
    ],
    tools: ['pgvector (HNSW)', 'BM25 Sparse', 'FlashRank Reranker', 'Reciprocal Rank Fusion'],
    status: 'LOCKED // PROVENANCE VERIFIED',
    color: '#00d26a',
  },
  {
    phase: 'P05',
    category: 'EVALUATION',
    cluster: 'PROD',
    title: 'Synthetic Evals & CI/CD Regression Gates',
    rule: 'No production deployment without passing quantitative RAGAS evaluation thresholds.',
    summary: 'Quantitative scoring via RAGAS metrics (faithfulness, answer relevance, context precision) with automated CI failure on regression.',
    rationale: 'Subjective "vibe checks" do not scale in production. Every agent pull request runs against automated golden datasets to verify that faithfulness and reasoning precision remain above the 0.92 evaluation ceiling.',
    guardrails: [
      'RAGAS Faithfulness score > 0.92 ceiling in CI pipelines',
      'Context Precision > 0.90 threshold across golden sets',
      'Automated pull-request blocker on any regression diff',
    ],
    tools: ['RAGAS Framework', 'DeepEval', 'Pytest Asyncio', 'Golden Test Matrix'],
    status: 'BENCHMARK // PASS CEILING',
    color: '#38bdf8',
  },
  {
    phase: 'P06',
    category: 'OBSERVABILITY',
    cluster: 'PROD',
    title: 'Distributed Telemetry & Hardening',
    rule: 'Total trace visibility: every token, latency hop, and tool execution measured in real-time.',
    summary: 'End-to-end OpenTelemetry trace spans, per-tenant token quotas, latency percentiles, and cryptographic execution logs.',
    rationale: 'Production AI systems require telemetry parity with high-frequency financial infrastructure. Every model call, tool latency, and token consumption is recorded in OpenTelemetry distributed trace graphs.',
    guardrails: [
      '100% Trace span coverage across multi-agent subgraphs',
      'Per-tenant token rate-limiter & quota pool management',
      'Zero PII logging with cryptographic hash audit trails',
    ],
    tools: ['OpenTelemetry (OTel)', 'Prometheus / Grafana', 'Docker Containers', 'FastAPI Middleware'],
    status: 'LIVE // TELEMETRY STREAMING',
    color: '#a855f7',
  },
];

function MethodologyConsole({
  onClose,
  onGoToWork,
}: {
  onClose: () => void;
  onGoToWork: () => void;
}) {
  const [activePhase, setActivePhase] = useState<number>(0);
  const [activeCluster, setActiveCluster] = useState<string>('ALL');

  const filteredPhases = useMemo(() => {
    if (activeCluster === 'ALL') return METHODOLOGY_PHASES;
    return METHODOLOGY_PHASES.filter((p) => p.cluster === activeCluster);
  }, [activeCluster]);

  return (
    <div className="methodology-console">
      {/* Console Top Telemetry Bar */}
      <div className="methodology-top-bar">
        <div className="methodology-badge">
          <span className="live-dot" />
          <span>AI SYSTEMS ENGINEERING PROTOCOL // v2.6 ARCHITECTURE SPEC</span>
        </div>
        <div className="methodology-status-tag">
          <span>STANDARD: DETERMINISTIC</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="methodology-hero">
        <div className="methodology-title-wrap">
          <span className="eyebrow" style={{ color: 'var(--primary)', marginBottom: '8px', display: 'block' }}>
            PRODUCTION ARCHITECTURE DISCIPLINE
          </span>
          <DialogTitle className="process-title" style={{ margin: 0, padding: 0 }}>
            ENGINEERING<br />METHODOLOGY
          </DialogTitle>
          <DialogDescription className="methodology-subtitle">
            Rigorous systems engineering principles for orchestrating deterministic multi-agent networks, resilient state machines, agentic RAG pipelines, and enterprise-grade observability.
          </DialogDescription>
        </div>

        {/* 4 Architectural Telemetry Metrics */}
        <div className="methodology-metrics-strip">
          <div className="methodology-metric-item">
            <span className="methodology-metric-val">100%</span>
            <span className="methodology-metric-label">DETERMINISTIC BOUNDARIES</span>
            <span className="methodology-metric-sub">Typed state transitions</span>
          </div>
          <div className="methodology-metric-item">
            <span className="methodology-metric-val">&lt;180ms</span>
            <span className="methodology-metric-label">P95 HOP LATENCY</span>
            <span className="methodology-metric-sub">FastAPI + AsyncIO</span>
          </div>
          <div className="methodology-metric-item">
            <span className="methodology-metric-val">&gt;0.92</span>
            <span className="methodology-metric-label">RAGAS EVAL CEILING</span>
            <span className="methodology-metric-sub">Faithfulness benchmark</span>
          </div>
          <div className="methodology-metric-item">
            <span className="methodology-metric-val">ZERO</span>
            <span className="methodology-metric-label">BLAST RADIUS</span>
            <span className="methodology-metric-sub">Human approval gates</span>
          </div>
        </div>
      </div>

      {/* Interactive Topology Pipeline Flow */}
      <div className="methodology-flow-section">
        <div className="methodology-flow-header">
          <span className="eyebrow">INTERACTIVE PIPELINE TOPOLOGY</span>
          <span className="methodology-flow-hint">SELECT ANY NODE TO INSPECT GUARDRAILS</span>
        </div>

        <div className="methodology-pipeline-track">
          {METHODOLOGY_PHASES.map((p, idx) => {
            const isSelected = activePhase === idx;
            return (
              <button
                key={p.phase}
                type="button"
                className={`methodology-node-btn ${isSelected ? 'node-active' : ''}`}
                onClick={() => {
                  setActivePhase(idx);
                  const el = document.getElementById(`methodology-card-${p.phase}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
              >
                <span className="methodology-node-num">{p.phase}</span>
                <span className="methodology-node-name">{p.category}</span>
                <span className="methodology-node-dot" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Cluster Filter Buttons */}
      <div className="methodology-filter-bar">
        {[
          { id: 'ALL', label: 'All Lifecycle Phases (06)' },
          { id: 'SPEC', label: '01. Spec & Governance' },
          { id: 'ORCH', label: '02. Orchestration & Retrieval' },
          { id: 'PROD', label: '03. Evals & Production' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`methodology-filter-pill ${activeCluster === tab.id ? 'active' : ''}`}
            onClick={() => setActiveCluster(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Phase Cards Grid */}
      <div className="methodology-cards-grid">
        {filteredPhases.map((phase) => {
          const originalIdx = METHODOLOGY_PHASES.findIndex((p) => p.phase === phase.phase);
          const isSelected = activePhase === originalIdx;

          return (
            <div
              key={phase.phase}
              id={`methodology-card-${phase.phase}`}
              className={`methodology-card ${isSelected ? 'card-highlighted' : ''}`}
              onClick={() => setActivePhase(originalIdx)}
            >
              {/* Card Header */}
              <div className="methodology-card-top">
                <div className="methodology-card-pills">
                  <span className="methodology-phase-pill">{phase.phase}</span>
                  <span className="methodology-cat-pill">{phase.category}</span>
                </div>
                <span className="methodology-card-status">
                  <span className="status-indicator-dot" />
                  {phase.status}
                </span>
              </div>

              {/* Title */}
              <h3 className="methodology-card-title">{phase.title}</h3>

              {/* Invariant Rule Quote */}
              <div className="methodology-rule-box">
                <span className="methodology-rule-quote">“</span>
                <p className="methodology-rule-text">{phase.rule}</p>
              </div>

              {/* Detailed Rationale */}
              <p className="methodology-card-desc">{phase.rationale}</p>

              {/* Guardrails Checklist */}
              <div className="methodology-guardrails-wrap">
                <span className="methodology-guardrails-heading">ARCHITECTURAL GUARDRAILS</span>
                <ul className="methodology-guardrails-list">
                  {phase.guardrails.map((g) => (
                    <li key={g}>
                      <span className="check-icon">✓</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tooling Tags */}
              <div className="methodology-tools-wrap">
                <span className="methodology-tools-heading">PRODUCTION STACK</span>
                <div className="methodology-tools-pills">
                  {phase.tools.map((t) => (
                    <span key={t} className="tool-pill">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Console Bottom Action Footer */}
      <div className="methodology-footer-banner">
        <div className="methodology-footer-id">
          <span className="live-dot" />
          <span>GORANTLA KAMALAKAR REDDY // AI SYSTEMS ENGINEER · BENGALURU, INDIA</span>
        </div>
        <div className="methodology-footer-actions">
          <button
            type="button"
            className="methodology-action-btn secondary"
            onClick={onClose}
          >
            CLOSE PROTOCOL [ESC]
          </button>
          <button
            type="button"
            className="methodology-action-btn primary"
            onClick={onGoToWork}
          >
            <span>FLAGSHIP AGENT SYSTEMS</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Portfolio({
  initialView = 'home',
  initialProject = 'workforce-ai',
}: {
  initialView?: View;
  initialProject?: string;
}) {
  // Screen Index 0..7
  const getInitialScreen = (): number => {
    if (initialView === 'vision') return 1;
    if (initialView === 'about') return 2;
    if (initialView === 'work' || initialView === 'systems' || initialView === 'project') return 3;
    if (initialView === 'experience') return 4;
    if (initialView === 'skills') return 5;
    if (initialView === 'playground') return 6;
    if (initialView === 'contact') return 7;
    return 1; // Start on 2nd page (Screen 02 / VISION) for home view and auto-scroll to 1st page
  };

  const [activeScreen, setActiveScreen] = useState<number>(getInitialScreen);
  const [prevScreen, setPrevScreen] = useState<number>(getInitialScreen);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Active Project within Screen 04 (WORK)
  const [activeProjectIdx, setActiveProjectIdx] = useState<number>(0);
  const [deepDiveProject, setDeepDiveProject] = useState<Project | null>(
    initialView === 'project'
      ? projects.find((p) => p.slug === initialProject) ?? projects[0]
      : null,
  );

  const [overlay, setOverlay] = useState<Overlay>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [sound, setSound] = useState<boolean>(false);
  const [time, setTime] = useState<string>('');
  const [reelStep, setReelStep] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'white'>('dark');
  const [intro, setIntro] = useState<boolean>(true);
  const [introExiting, setIntroExiting] = useState<boolean>(false);

  const [repoCategory, setRepoCategory] = useState<string>('All');
  const [repoSearch, setRepoSearch] = useState('');
  const [studyIndex, setStudyIndex] = useState(0);
  const repoCategories = useMemo(
    () => ['All', ...new Set(otherWork.map((w) => w.category).filter(Boolean))],
    [],
  );
  const filteredRepos = useMemo(() => otherWork.filter(w =>
    (repoCategory === 'All' || w.category === repoCategory) &&
    `${w.name} ${w.blurb} ${w.tech}`.toLowerCase().includes(repoSearch.trim().toLowerCase())
  ), [repoCategory, repoSearch]);

  const wheelLock = useRef<number>(0);
  const touchStartY = useRef<number | null>(null);
  const player = useRef<PortfolioAudio | null>(null);
  const deck = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef<boolean>(false);
  const hasAutoScrolled = useRef<boolean>(false);

  const currentProject = projects[activeProjectIdx];
  const activeSlug = currentProject.slug;
  const activeThemeSpec = PROJECT_THEME_COLORS[theme][activeSlug];

  // Dynamic Scene Selection per Screen
  const activeSceneConfig = useMemo(() => {
    if (activeScreen === 0) {
      // 01 / HOME
      return {
        build: neuralTunnel,
        accent: '#ff5500',
        ink: theme === 'white' ? '#111418' : '#ff8400',
      };
    }
    if (activeScreen === 1) {
      // 02 / VISION (Canvas with subtle neural background)
      return {
        build: neuralTunnel,
        accent: '#ff5500',
        ink: theme === 'white' ? '#111418' : '#ff8400',
      };
    }
    if (activeScreen === 2) {
      // 03 / ABOUT
      return {
        build: brainMesh,
        accent: '#ff5500',
        ink: theme === 'white' ? '#111418' : '#ff8400',
      };
    }
    if (activeScreen === 3) {
      // 04 / WORK
      return {
        build: PROJECT_SCENE[activeSlug] ?? neuralTunnel,
        accent: activeThemeSpec?.color ?? '#ff5500',
        ink: activeThemeSpec?.ink ?? (theme === 'white' ? '#111418' : '#ff8400'),
      };
    }
    if (activeScreen === 4) {
      // 05 / EXPERIENCE
      return {
        build: spatialTimeline,
        accent: '#ff5500',
        ink: theme === 'white' ? '#111418' : '#ff8400',
      };
    }
    if (activeScreen === 5) {
      // 06 / SKILLS
      return {
        build: skillsEcosystem,
        accent: '#ff5500',
        ink: theme === 'white' ? '#111418' : '#ff8400',
      };
    }
    if (activeScreen === 6) {
      // 07 / PLAYGROUND
      return {
        build: PLAYGROUND_SCENE['rasengan-chidori'].build,
        accent: PLAYGROUND_SCENE['rasengan-chidori'].accent,
        ink: theme === 'white' ? '#111418' : PLAYGROUND_SCENE['rasengan-chidori'].ink,
      };
    }
    // 08 / CONTACT
    return {
      build: contactBeacon,
      accent: '#ff5500',
      ink: theme === 'white' ? '#111418' : '#ff8400',
    };
  }, [activeScreen, activeSlug, activeThemeSpec, theme]);

  // Screen Transition Controller
  const goToScreen = useCallback(
    (targetIndex: number) => {
      if (isTransitioning || targetIndex === activeScreen) return;
      if (targetIndex < 0 || targetIndex >= SCREENS.length) return;

      const newDir = targetIndex > activeScreen ? 1 : -1;
      setDirection(newDir);
      setPrevScreen(activeScreen);
      setIsTransitioning(true);
      setActiveScreen(targetIndex);
      if (window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(12);
      player.current?.cue('transition');
      setOverlay(null);

      const targetScreen = SCREENS[targetIndex];
      const targetPath =
        targetScreen.id === 'home'
          ? '/'
          : `/${targetScreen.id}`;
      history.pushState({}, '', targetPath);

      if (sound) {
        player.current?.setScene(
          targetScreen.id === 'home' || targetScreen.id === 'work'
            ? 'work'
            : targetScreen.id === 'about'
            ? 'about'
            : 'playground',
        );
      }

      setTimeout(() => {
        setIsTransitioning(false);
      }, 650);
    },
    [activeScreen, isTransitioning, sound],
  );

  // Auto-scroll: When landing on Home view (starts on Screen 02 / VISION), automatically scroll to Screen 01 / HOME
  useEffect(() => {
    if (initialView !== 'home' || hasAutoScrolled.current) return;
    if (intro || overlay || lightbox !== null || deepDiveProject) return;

    const timer = setTimeout(() => {
      if (!hasAutoScrolled.current && activeScreen === 1) {
        hasAutoScrolled.current = true;
        goToScreen(0);
      }
    }, 2200);

    const cancelAutoScroll = () => {
      hasAutoScrolled.current = true;
      clearTimeout(timer);
    };

    window.addEventListener('wheel', cancelAutoScroll, { passive: true });
    window.addEventListener('touchstart', cancelAutoScroll, { passive: true });
    window.addEventListener('keydown', cancelAutoScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('wheel', cancelAutoScroll);
      window.removeEventListener('touchstart', cancelAutoScroll);
      window.removeEventListener('keydown', cancelAutoScroll);
    };
  }, [initialView, intro, overlay, lightbox, deepDiveProject, activeScreen, goToScreen]);

  // 5 Distinct Spatial Transition Languages per Screen Pair
  const getScreenTransitionClass = useCallback(
    (screenIdx: number): string => {
      if (activeScreen === screenIdx) {
        return 'screen-active';
      }

      if (prevScreen === screenIdx && isTransitioning) {
        // Outgoing slide transition languages
        if (
          (prevScreen === 0 && activeScreen === 1) ||
          (prevScreen === 1 && activeScreen === 0) ||
          (prevScreen === 1 && activeScreen === 2) ||
          (prevScreen === 2 && activeScreen === 1)
        ) {
          return 'trans-dolly-exit';
        }
        if (
          (prevScreen === 2 && activeScreen === 3) ||
          (prevScreen === 3 && activeScreen === 2)
        ) {
          return 'trans-rotate-exit';
        }
        if (
          (prevScreen === 3 && activeScreen === 4) ||
          (prevScreen === 4 && activeScreen === 3)
        ) {
          return 'trans-stream-exit';
        }
        if (
          prevScreen >= 4 &&
          prevScreen <= 6 &&
          activeScreen >= 4 &&
          activeScreen <= 6
        ) {
          return 'trans-panel-exit';
        }
        if (
          (prevScreen === 6 && activeScreen === 7) ||
          (prevScreen === 7 && activeScreen === 6)
        ) {
          return 'trans-portal-exit';
        }
        return direction === 1 ? 'screen-exit-up' : 'screen-exit-down';
      }

      // Entering / Idle slides
      if (screenIdx > activeScreen) {
        if (screenIdx === activeScreen + 1) {
          if (activeScreen === 0 || activeScreen === 1) return 'trans-dolly-enter';
          if (activeScreen === 2) return 'trans-rotate-enter';
          if (activeScreen === 3) return 'trans-stream-enter';
          if (activeScreen >= 4 && activeScreen <= 5) return 'trans-panel-enter';
          if (activeScreen === 6) return 'trans-portal-enter';
        }
        return 'screen-enter-down';
      } else {
        if (screenIdx === activeScreen - 1) {
          if (activeScreen === 1 || activeScreen === 2) return 'trans-dolly-enter';
          if (activeScreen === 3) return 'trans-rotate-enter';
          if (activeScreen === 4) return 'trans-stream-enter';
          if (activeScreen >= 5 && activeScreen <= 6) return 'trans-panel-enter';
          if (activeScreen === 7) return 'trans-portal-enter';
        }
        return 'screen-enter-up';
      }
    },
    [activeScreen, prevScreen, isTransitioning, direction],
  );

  // Sound Engine Controller
  const toggleSound = useCallback(async (enabled: boolean) => {
    if (!player.current)
      player.current = createPortfolioAudio(() => setSound(false));
    if (!enabled) {
      player.current.disable();
      setSound(false);
      return;
    }
    const source = await player.current.enable('work');
    setSound(source !== 'off');
  }, []);

  // Intro Dismissal & Portfolio Opening with Audio Wired
  const handleEnter = useCallback(() => {
    setIntroExiting(true);
    toggleSound(true).catch(() => {});
    setTimeout(() => {
      setIntro(false);
      setIntroExiting(false);
    }, 550);
  }, [toggleSound]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  const toggleTheme = (toWhite: boolean) => {
    const next = toWhite ? 'white' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('kr_portfolio_theme', next);
    } catch {}
    if (toWhite) {
      document.documentElement.classList.add('theme-white');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('theme-white');
      document.documentElement.classList.add('dark');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (intro) {
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
          e.preventDefault();
          handleEnter();
        }
        return;
      }
      if (deepDiveProject) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setDeepDiveProject(null);
        }
        return;
      }
      if (overlay || lightbox !== null) return;
      if (
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(e.target.tagName)
      ) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goToScreen(activeScreen + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToScreen(activeScreen - 1);
      } else if (e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        goToScreen(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [intro, deepDiveProject, overlay, lightbox, activeScreen, goToScreen, handleEnter]);

  // Wheel listener for screen-to-screen navigation
  useEffect(() => {
    if (intro || overlay || lightbox !== null || deepDiveProject) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 18) return;

      const activeSlideEl = document.querySelector(
        `.screen-slide[data-screen="${activeScreen}"] .screen-scroll-body`,
      );
      if (activeSlideEl) {
        const atTop = activeSlideEl.scrollTop <= 2;
        const atBottom =
          activeSlideEl.scrollHeight - activeSlideEl.clientHeight - activeSlideEl.scrollTop <= 2;

        if (e.deltaY > 0 && !atBottom) return;
        if (e.deltaY < 0 && !atTop) return;
      }

      e.preventDefault();
      const now = performance.now();
      if (now - wheelLock.current < 650) return;
      wheelLock.current = now;

      if (e.deltaY > 0) {
        goToScreen(activeScreen + 1);
      } else {
        goToScreen(activeScreen - 1);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [intro, overlay, lightbox, deepDiveProject, activeScreen, goToScreen]);

  // Touch swipe listener
  useEffect(() => {
    if (intro || overlay || lightbox !== null || deepDiveProject) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const dy = touchStartY.current - e.changedTouches[0].clientY;
      touchStartY.current = null;

      if (Math.abs(dy) < 55) return;
      const now = performance.now();
      if (now - wheelLock.current < 650) return;
      wheelLock.current = now;

      if (dy > 0) {
        goToScreen(activeScreen + 1);
      } else {
        goToScreen(activeScreen - 1);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [intro, overlay, lightbox, deepDiveProject, activeScreen, goToScreen]);

  // Document class and title
  useEffect(() => {
    document.documentElement.classList.add('viewport-fixed');
    document.body.classList.add('viewport-fixed');
    return () => {
      document.documentElement.classList.remove('viewport-fixed');
      document.body.classList.remove('viewport-fixed');
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kr_portfolio_theme');
      if (saved === 'white') {
        setTheme('white');
        document.documentElement.classList.add('theme-white');
        document.documentElement.classList.remove('dark');
      } else {
        setTheme('dark');
        document.documentElement.classList.remove('theme-white');
        document.documentElement.classList.add('dark');
      }
    } catch {}

    const tick = () =>
      setTime(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date()),
      );
    tick();
    const clock = setInterval(tick, 60000);

    const pop = () => {
      const path = window.location.pathname;
      if (path === '/vision') setActiveScreen(1);
      else if (path === '/about') setActiveScreen(2);
      else if (path === '/work' || path === '/systems') setActiveScreen(3);
      else if (path === '/experience') setActiveScreen(4);
      else if (path === '/skills') setActiveScreen(5);
      else if (path === '/playground') setActiveScreen(6);
      else if (path === '/contact') setActiveScreen(7);
      else if (path.startsWith('/project/')) {
        const s = path.split('/')[2];
        const p = projects.find((x) => x.slug === s);
        if (p) {
          setDeepDiveProject(p);
          setActiveScreen(3);
        }
      } else {
        setActiveScreen(0);
      }
    };
    window.addEventListener('popstate', pop);

    return () => {
      clearInterval(clock);
      window.removeEventListener('popstate', pop);
      player.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const sName = SCREENS[activeScreen].title;
    document.title = `${sName} — Kamalakar Reddy Gorantla // AI Systems Engineer`;
  }, [activeScreen]);

  // Expanded constellation navigation
  const navigation = (
    <>
      {SCREENS.map((sc, idx) => (
        <button
          key={sc.id}
          type="button"
          onClick={() => {
            goToScreen(idx);
            setOverlay(null);
          }}
          onPointerEnter={() => player.current?.cue('hover')}
          aria-current={activeScreen === idx ? 'page' : undefined}
        >
          <span className="nav-arrow">{activeScreen === idx ? '→' : ''}</span>
          <RollingText>{sc.title}</RollingText>
        </button>
      ))}
    </>
  );

  return (
    <>
      <div className="scanline-overlay" aria-hidden="true" />

      {/* Cursor glow trail */}


      {/* Screen progress bar */}
      {!intro && (
        <div className="screen-progress-bar" aria-hidden="true">
          <div
            className="screen-progress-fill"
            style={{ width: `${((activeScreen + 1) / SCREENS.length) * 100}%` }}
          />
        </div>
      )}

      {/* Intro Loading Sequence */}
      {intro && (
        <div
          className={`intro-stage ${introExiting ? 'intro-exit' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome Introduction"
        >
          <div className="intro-webgl-wrapper">
            <WebGLHost
              build={introSingularity}
              accent="#ff5500"
              ink={theme === 'white' ? '#111418' : '#ff8400'}
            />
          </div>
          <div className="intro-stage-overlay">
            <div className="intro-stage-top">
              <div className="kr-stamp-badge intro-kr-badge" aria-label="Kamalakar Reddy Gorantla">
                <span className="kr-stamp-letters">K/R</span>
                <span className="kr-stamp-line" />
                <span className="kr-stamp-sub">®</span>
              </div>
              <button
                type="button"
                className="intro-skip-btn"
                onClick={handleEnter}
              >
                SKIP INTRO ↗
              </button>
            </div>
            <div className="intro-stage-center">
              <span className="intro-kicker">
                AI SYSTEMS ENGINEER
              </span>
              <h1 className="intro-hero-title scramble-hero-name" aria-label="Kamalakar Reddy Gorantla">
                <ScrambleText text="KAMALAKAR" active={intro} />
                <br />
                <ScrambleText text="REDDY" active={intro} />
                <br />
                <ScrambleText text="GORANTLA" active={intro} className="scramble-last" />
              </h1>
              <p className="intro-hero-subtitle">
                Building reliable AI systems and thoughtful software.
              </p>
              <button
                type="button"
                className="intro-enter-btn"
                onClick={handleEnter}
              >
                <span>EXPLORE PORTFOLIO</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="intro-stage-bottom">
              <span>BENGALURU, INDIA</span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Site Header */}
      <header className="site-header">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setOverlay((current) => (current === 'menu' ? null : 'menu'))}
          aria-label={overlay === 'menu' ? 'Close navigation menu' : 'Open navigation menu'}
          aria-controls="site-navigation"
          aria-expanded={overlay === 'menu'}
        >
          <span className="menu-toggle-icon" aria-hidden="true"><i /><i /></span>
          <em>MENU</em>
        </button>

        <div className="header-role">
          <span className="live-dot" /> AI Systems Engineer
        </div>

        <button
          type="button"
          className={`audio-control audio-toggle-button ${sound ? 'sound-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleSound(!sound);
          }}
          aria-label={sound ? 'Mute audio' : 'Enable audio'}
        >
          <span>SOUND: {sound ? 'ON' : 'OFF'}</span>
          <span className={`sound-bars ${sound ? 'sound-on' : ''}`} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        </button>

        {/* KR Badge + Theme Toggle - centered in header */}
        <div className="header-kr-group">
          <button
            type="button"
            className="kr-stamp-badge kr-stamp-badge--header"
            onClick={() => goToScreen(0)}
            aria-label="Kamalakar Reddy Gorantla (K/R) Home"
          >
            <span className="kr-stamp-letters">K/R</span>
            <span className="kr-stamp-line" />
            <span className="kr-stamp-sub">®</span>
          </button>
          <div className="theme-control theme-control--inline">
            <Switch
              checked={theme === 'white'}
              onCheckedChange={toggleTheme}
              aria-label="Toggle theme"
              size="sm"
            />
          </div>
        </div>

        <div className="header-contact">
          <button onClick={() => goToScreen(7)}>
            <span>CONTACT</span>
          </button>
        </div>
      </header>

      {/* Minimal Side Rail Navigator */}
      <nav className="hud-side-rail" aria-label="Screen Navigator">
        {SCREENS.map((sc, idx) => (
          <button
            key={sc.id}
            type="button"
            className={`hud-rail-node ${activeScreen === idx ? 'active' : ''}`}
            onClick={() => goToScreen(idx)}
            onPointerEnter={() => player.current?.cue('hover')}
            aria-label={`Jump to Screen ${sc.number}: ${sc.title}`}
          >
            <span className="rail-label">
              {sc.number} {sc.title}
            </span>
            <span className="rail-num">{sc.number}</span>
            <span className="rail-dot" />
          </button>
        ))}
      </nav>

      {/* Main Multi-Screen Digital Stage */}
      <div className="screen-stage">
        {activeScreen === 0 && !intro && <AmbientTerminal />}
        {activeScreen === 3 && <div key={activeSlug} className="project-color-pulse" style={{ '--project-glow': activeThemeSpec.color } as CSSProperties} aria-hidden="true" />}
        {/* Dynamic 3D WebGL Backdrop */}
        <div style={{ visibility: activeScreen === 6 ? 'hidden' : undefined }} className={`screen-stage-backdrop ${activeScreen === 3 ? 'backdrop-work-offset' : ''}`}>
          <WebGLHost
            key={`scene-${activeScreen}-${activeSlug}`}
            build={activeSceneConfig.build}
            accent={activeSceneConfig.accent}
            ink={activeSceneConfig.ink}
            interactive={true}
          />
        </div>

        {/* ====================================================================
            SCREEN 01: HOME / NEURAL CORE
            ==================================================================== */}
        <section
          data-screen="0"
          className={`screen-slide ${getScreenTransitionClass(0)}`}
          inert={intro || activeScreen !== 0 || undefined}
          aria-hidden={activeScreen !== 0}
        >
          <div className="work-intro" style={{ position: 'relative', top: 'auto', left: 'auto', width: 'auto', maxWidth: '780px', marginTop: 'auto', marginBottom: 'auto' }}>
            <span className="eyebrow">AI SYSTEMS ENGINEER · BENGALURU</span>
            <div className="masked-reveal">
              <h1 className="scramble-hero-name" aria-label={profile.name}><HeroName active={activeScreen === 0 && !intro} /></h1>
            </div>
            <p>
              I build reliable AI systems, from intelligent agents
              and retrieval pipelines to production applications.
            </p>

            <div style={{ display: 'flex', gap: '14px', marginTop: '24px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="intro-enter-btn"
                onClick={() => goToScreen(3)}
              >
                <span>VIEW PROJECTS</span>
                <span aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                className="intro-skip-btn"
                onClick={() => goToScreen(7)}
              >
                <span>GET IN TOUCH ↗</span>
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SCREEN 02: VISION / FULL FIT TO SCREEN ARCHITECTURE CANVAS
            ==================================================================== */}
        <section
          data-screen="1"
          className={`screen-slide screen-fullbleed ${getScreenTransitionClass(1)}`}
          inert={intro || activeScreen !== 1 || undefined}
          aria-hidden={activeScreen !== 1}
        >
          <div className="vision-fullbleed-stage">
            <VisionLabels active={activeScreen === 1} />
            {/* Edge-to-edge background picture filling 100% of the screen */}
            <div className="vision-backdrop-layer">
              <img
                src="/images/portfolio-library/P08-artwork.png"
                alt="Tactile print system portrait of Kamalakar Reddy Gorantla with cooperating agent figures"
                className="vision-fullbleed-img"
                fetchPriority="high"
              />
            </div>

            {/* Top HUD elements floating over full screen image */}
            <div className="vision-top-bar">
              <div className="vision-top-left">
                <button
                  type="button"
                  className="kr-stamp-badge"
                  onClick={() => goToScreen(0)}
                  aria-label="Kamalakar Reddy Gorantla (K/R) Home"
                >
                  <span className="kr-stamp-letters">K/R</span>
                  <span className="kr-stamp-line" />
                  <span className="kr-stamp-sub">®</span>
                </button>
                <div className="vision-system-badge">
                  <span className="live-dot" />
                  <span>02 / HUMAN IN THE LOOP ARCHITECTURE</span>
                </div>
              </div>

              <div className="vision-telemetry-kicker">
                <span>MULTI-AGENT SYSTEMS</span><br />
                <span>RAG & PRODUCTION BACKENDS</span>
              </div>
            </div>

            {/* Bottom HUD elements */}
            <div className="vision-bottom-bar">
              <span>LINOCUT & RISOGRAPH · SYSTEM PORTRAIT</span>
              <span>PRESS ↓ OR SCROLL TO ENTER ABOUT [03 / 08]</span>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SCREEN 03: ABOUT / AUTONOMOUS ARCHITECTURE
            ==================================================================== */}
        <section
          data-screen="2"
          className={`screen-slide ${getScreenTransitionClass(2)}`}
          inert={intro || activeScreen !== 2 || undefined}
          aria-hidden={activeScreen !== 2}
        >
          <div className="screen-scroll-body about-page">
            <div className="about-lead">
              <div className="about-portrait">
                <span className="portrait-year year-first">20</span>
                <div className="portrait-frame">
                  <img
                    src="/images/portfolio-library/P06-artwork.png"
                    alt="Engineering portrait of Kamalakar Reddy Gorantla with autonomous system architectures"
                  />
                </div>
                <span className="portrait-year year-last">25</span>
                <span className="portrait-note">
                  B.TECH, COMPUTER SCIENCE<br />
                  CLASS OF 2025
                </span>
              </div>
              <div className="about-statement">
                <span className="eyebrow">ENGINEERING PROFILE</span>
                <h1>
                  Building reliable<br />AI systems.
                </h1>
                <p>
                  I am an AI systems engineer based in Bengaluru specializing in
                  multi-agent architectures, agentic retrieval systems, and
                  end-to-end production engineering. I design systems with verified
                  handoffs, deterministic boundaries, and human-in-the-loop
                  governance.
                </p>
                <p>
                  From distributed agent orchestration and vector search to
                  production APIs and high-performance WebGL interfaces, I own
                  systems from architecture to deployment.
                </p>
                <div className="about-stats">
                  {[[projects.length, 'AI projects'], [projects.length + otherWork.length, 'Featured repos'], [2, 'Internships']].map(([value, label]) => <div key={label}><strong><CountUp target={Number(value)} active={activeScreen === 2 && !intro} /></strong><span>{label}</span></div>)}
                </div>
                <button
                  type="button"
                  className="process-link text-link"
                  onClick={() => setOverlay('process')}
                >
                  <RollingText>Engineering methodology & process</RollingText> ↗
                </button>
              </div>
            </div>
              <Reveal className="education">
                <div>
                  <span className="eyebrow">EDUCATION</span>
                  <h3>
                    Kalasalingam Academy<br />
                    of Research & Education
                  </h3>
                  <p>B.Tech, Computer Science · 2021–2025 · 78%</p>
                  <p>
                    Sri Chaitanya Junior College<br />
                    Intermediate, MPC · 2019–2021 · 94.8%
                  </p>
                </div>
                <div>
                  <span className="eyebrow">RECOGNITION & LEARNING</span>
                  <ul>
                    <li>IBM ICE Day — 1st prize, GenAI + Cybersecurity</li>
                    <li>TurboQuant research reproduction — ICLR 2026 work</li>
                    <li>Oracle AI Infrastructure certification</li>
                    <li>Cisco Ethical Hacking certification</li>
                    <li>Prompt Engineering — Udemy</li>
                  </ul>
                </div>
              </Reveal>
          </div>
        </section>

        {/* ====================================================================
            SCREEN 04: WORK / 5 FLAGSHIP MULTI-AGENT SYSTEMS
            ==================================================================== */}
        <section
          data-screen="3"
          className={`screen-slide ${getScreenTransitionClass(3)}`}
          inert={intro || activeScreen !== 3 || undefined}
          aria-hidden={activeScreen !== 3}
        >
          <div className="work-view" style={{ position: 'relative', inset: 'auto', width: '100%', height: '100%' }}>
            <div className="work-intro" style={{ top: '28%' }}>
              <span className="eyebrow">INDEPENDENT PROJECT / {pad(activeProjectIdx + 1)}</span>
              <h1 className="work-project-name">{currentProject.name}</h1>
              <p>{currentProject.headline}</p>
              <dl className="project-meta">
                <div>
                  <dt>Role</dt>
                  <dd>
                    Architecture<br />
                    Backend & frontend
                  </dd>
                </div>
                <div>
                  <dt>Build</dt>
                  <dd>{currentProject.tag}</dd>
                </div>
                <div>
                  <dt>Focus</dt>
                  <dd>{currentProject.stack.slice(0, 3).join(' / ')}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="enter-3d-lab-btn"
                onClick={() => setDeepDiveProject(currentProject)}
              >
                <span className="live-dot" /> INSPECT 3D ARCHITECTURE ↗
              </button>
            </div>

            {/* 3D Perspective Card Deck */}
            <div
              className="carousel-perspective"
              ref={deck}
              role="region"
              aria-roledescription="carousel"
              aria-label="Selected projects"
              onPointerDown={(e) => {
                dragStart.current = { x: e.clientX, y: e.clientY };
                dragged.current = false;
              }}
              onPointerMove={(e) => {
                if (dragStart.current && Math.abs(e.clientY - dragStart.current.y) > 15)
                  dragged.current = true;
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty(
                  '--mouse-x',
                  `${(e.clientX - r.left - r.width / 2) * 0.025}deg`,
                );
                e.currentTarget.style.setProperty(
                  '--mouse-y',
                  `${-(e.clientY - r.top - r.height / 2) * 0.014}deg`,
                );
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.setProperty('--mouse-x', '0deg');
                e.currentTarget.style.setProperty('--mouse-y', '0deg');
              }}
              onPointerUp={(e) => {
                if (!dragStart.current) return;
                const dy = e.clientY - dragStart.current.y;
                const dx = e.clientX - dragStart.current.x;
                if (Math.abs(dy) > 40 || Math.abs(dx) > 50) {
                  dragged.current = true;
                  setActiveProjectIdx((prev) =>
                    wrap(prev + ((Math.abs(dy) > Math.abs(dx) ? dy : dx) > 0 ? 1 : -1), projects.length),
                  );
                }
                dragStart.current = null;
              }}
            >
              {projects.map((p, i) => {
                const total = projects.length;
                const raw = wrap(i - activeProjectIdx, total);
                const delta = raw > total / 2 ? raw - total : raw;
                return (
                  <div
                    key={p.slug}
                    className={`carousel-card ${delta === 0 ? 'card-active' : ''}`}
                    style={
                      {
                        '--project-glow': PROJECT_THEME_COLORS[theme][p.slug].color,
                        '--delta': delta,
                        '--distance': Math.abs(delta),
                        '--turn': delta === 0 ? -3 : delta * -13,
                        zIndex: total - Math.abs(delta),
                      } as CSSProperties
                    }
                    aria-hidden={i !== activeProjectIdx}
                  >
                    <button
                      type="button"
                      className="card-open"
                      tabIndex={i === activeProjectIdx ? 0 : -1}
                      aria-label={`Inspect ${p.name}`}
                      onClick={() => {
                        if (dragged.current) {
                          dragged.current = false;
                          return;
                        }
                        if (delta !== 0) {
                          setActiveProjectIdx(i);
                          return;
                        }
                        setDeepDiveProject(p);
                      }}
                    >
                      <ProjectCover project={p} />
                      <span className="view-project">Inspect 3D Architecture ↗</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Work Index */}
            <aside className="work-index">
              <span className="eyebrow">FLAGSHIP AGENT SYSTEMS</span>
              <div className="index-list">
                {projects.map((p, i) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setActiveProjectIdx(i)}
                    className={activeProjectIdx === i ? 'selected' : ''}
                    aria-pressed={activeProjectIdx === i}
                  >
                    <small>{pad(i + 1)}</small>
                    <RollingText>{p.name}</RollingText>
                    <span className="index-arrow">↗</span>
                  </button>
                ))}
              </div>
              <p className="index-description">{currentProject.summary}</p>
            </aside>

            {/* Counter */}
            <div className="work-counter">
              <span className="eyebrow">SELECTED SYSTEM</span>
              <div className="counter-window">
                <strong>{pad(activeProjectIdx + 1)}</strong>
                <span>/{pad(projects.length)}</span>
              </div>
            </div>

            {/* Footer controls within work */}
            <footer className="work-footer">
              <span className="scroll-hint">
                <i>↔</i> Drag cards or select index to cycle systems
              </span>
              <div className="carousel-controls">
                <button
                  type="button"
                  onClick={() =>
                    setActiveProjectIdx((p) => wrap(p - 1, projects.length))
                  }
                  aria-label="Previous project"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveProjectIdx((p) => wrap(p + 1, projects.length))
                  }
                  aria-label="Next project"
                >
                  ↓
                </button>
              </div>
              <button
                type="button"
                className="reel-button"
                onClick={() => {
                  setReelStep(0);
                  setPlaying(true);
                  setOverlay('reel');
                }}
              >
                <RollingText>Systems reel</RollingText>
                <span>▶</span>
              </button>
            </footer>
          </div>
        </section>

        {/* ====================================================================
            SCREEN 05: EXPERIENCE / PRODUCTION TELEMETRY
            ==================================================================== */}
        <section
          data-screen="4"
          className={`screen-slide ${getScreenTransitionClass(4)}`}
          inert={intro || activeScreen !== 4 || undefined}
          aria-hidden={activeScreen !== 4}
        >
          <div className="screen-scroll-body">
            <div className="about-details" style={{ padding: '20px 0 40px' }}>
              <Reveal className="section-kicker">
                <span>01 / EXPERIENCE</span>
                <h2>Where I’ve built.</h2>
              </Reveal>
              <div className="experience-list">
                <Reveal className="experience-row">
                  <div>
                    <span className="eyebrow">SEP 2025 — PRESENT</span>
                    <h3>Terralogic</h3>
                    <p>
                      Associate Software Engineer<br />
                      AI & Backend · Bengaluru
                    </p>
                  </div>
                  <div>
                    <ul>
                      <li>
                        Role-based authentication and tool boundaries for question
                        generation, solving, and knowledge-base workflows.
                      </li>
                      <li>
                        ITSM backend work across Kafka, Redis, provider state machines,
                        REST endpoints, and encrypted data.
                      </li>
                      <li>
                        HubSpot and Notion integrations, OAuth token lifecycles, and a
                        LangGraph-to-AgentScope chatbot migration.
                      </li>
                    </ul>
                    <p className="experience-evidence">
                      <span>See it built:</span>{' '}
                      <External href="https://github.com/kl987456/smate-backend">
                        SMATE API
                      </External>{' '}
                      <External href="https://github.com/kl987456/smate-frontend">
                        SMATE interface
                      </External>
                    </p>
                  </div>
                </Reveal>
                <Reveal className="experience-row">
                  <div>
                    <span className="eyebrow">JUN — AUG 2025</span>
                    <h3>WhatBytes</h3>
                    <p>Backend Intern · Remote</p>
                  </div>
                  <div>
                    <p>Worked on API performance and training-data preparation.</p>
                    <ul>
                      <li>
                        Redis caching and query restructuring reduced median API
                        response time by approximately 40%.
                      </li>
                      <li>
                        SQL-based ETL work improved ML training-data readiness by
                        approximately 35%.
                      </li>
                    </ul>
                    <p className="experience-evidence">
                      <span>See it built:</span>{' '}
                      <External href="https://github.com/kl987456/whatbytes-backend-assignment">
                        Healthcare Records API
                      </External>{' '}
                      <External href="https://github.com/kl987456/backend-intern-credits">
                        Credits API
                      </External>{' '}
                      <External href="https://github.com/kl987456/backend-intern-crud">
                        Blog API
                      </External>
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SCREEN 06: SKILLS / TECHNICAL ECOSYSTEM
            ==================================================================== */}
        <section
          data-screen="5"
          className={`screen-slide ${getScreenTransitionClass(5)}`}
          inert={intro || activeScreen !== 5 || undefined}
          aria-hidden={activeScreen !== 5}
        >
          <div className="screen-scroll-body">
            <div className="about-details" style={{ padding: '20px 0 40px' }}>
              <Reveal className="capabilities" style={{ borderTop: 0, paddingTop: 0 }}>
                <div>
                  <span className="eyebrow">02 / CAPABILITIES</span>
                  <h2>From retrieval<br />to release.</h2>
                </div>
                <div className="skill-columns">
                  <div>
                    <h3>Agentic AI</h3>
                    <p>
                      LangGraph · LangChain · AgentScope<br />
                      Supervisor & routing patterns<br />
                      RAG · Hybrid retrieval · RAGAS<br />
                      MCP · OpenAI & Claude APIs
                    </p>
                  </div>
                  <div>
                    <h3>Engineering</h3>
                    <p>
                      Python · FastAPI · Node.js<br />
                      React · Next.js · TypeScript<br />
                      PostgreSQL · pgvector · Redis<br />
                      Docker · Pytest · Git
                    </p>
                  </div>
                  <div>
                    <h3>How I build</h3>
                    <p>
                      Claude Code · OpenAI Codex<br />
                      Gemini CLI<br />
                      Typed contracts · Evaluation<br />
                      Human approval boundaries
                    </p>
                  </div>
                </div>
              </Reveal>

            </div>
          </div>
        </section>

        {/* ====================================================================
            SCREEN 07: PLAYGROUND / CREATIVE LAB & ARCHIVES
            ==================================================================== */}
        <section
          data-screen="6"
          className={`screen-slide ${getScreenTransitionClass(6)}`}
          inert={intro || activeScreen !== 6 || undefined}
          aria-hidden={activeScreen !== 6}
        >
          <div className="screen-scroll-body">
            <div className="playground-view" style={{ padding: '20px 0 60px', minHeight: 'auto' }}>
              <section className="playground-lead" style={{ marginBottom: '24px' }}>
                <span className="eyebrow">EXPERIMENTS & PROJECTS</span>
                <h1
                  style={{
                    fontFamily: "var(--font-serif), Georgia, serif",
                    fontSize: 'clamp(42px, 6vw, 84px)',
                    fontWeight: 400,
                    letterSpacing: '-0.06em',
                    margin: '16px 0 20px',
                  }}
                >
                  PLAYGROUND<span>↘</span>
                </h1>
                <p
                  style={{
                    fontSize: '17px',
                    color: 'var(--muted-foreground)',
                    maxWidth: '680px',
                    lineHeight: 1.55,
                  }}
                >
                  A selection of AI experiments, backend applications, and interactive 3D studies.
                </p>

                <div className="studies-showcase">
                  <div className="study-stage">
                    {activeScreen === 6 && !intro && <WebGLHost
                      build={PLAYGROUND_SCENE[gallery[studyIndex].scene].build}
                      accent={PLAYGROUND_SCENE[gallery[studyIndex].scene].accent}
                      ink={PLAYGROUND_SCENE[gallery[studyIndex].scene].ink}
                      interactive
                    />}
                    <button className="study-expand" onClick={() => setLightbox(studyIndex)}>Explore in 3D ↗</button>
                  </div>
                  <div className="study-selectors" role="group" aria-label="Choose a 3D study">
                    {gallery.map((study, i) => <button key={study.scene} aria-pressed={studyIndex === i} onClick={() => setStudyIndex(i)}>
                      <small>{pad(i + 1)} / 3D STUDY</small><strong>{study.title}</strong><span>{study.caption}</span>
                    </button>)}
                  </div>
                </div>
                <div className="project-library-heading"><h2>Project collection</h2><label className="project-search"><span className="sr-only">Search projects</span><input type="search" value={repoSearch} onChange={e => setRepoSearch(e.target.value)} placeholder="Search projects or technologies" /></label></div>
                <div className="repo-filter-bar" role="group" aria-label="Filter projects by category" style={{ marginTop: '20px' }}>
                  {repoCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      aria-pressed={repoCategory === cat}
                      className={`repo-filter-btn ${
                        repoCategory === cat ? 'active' : ''
                      }`}
                      onClick={() => setRepoCategory(cat)}
                    >
                      {cat}{' '}
                      {cat === 'All'
                        ? `(${otherWork.length})`
                        : `(${otherWork.filter((w) => w.category === cat).length})`}
                    </button>
                  ))}
                </div>
              </section>

              <div className="project-results-count" aria-live="polite">{filteredRepos.length} {filteredRepos.length === 1 ? 'project' : 'projects'}</div>
              <div className="project-library-grid">
                {filteredRepos.map(w => <article className="library-project" key={w.repo}>
                  <span className="repo-category-pill">{w.category}</span>
                  <h3>{w.name}</h3><p>{w.blurb}</p>
                  <div className="library-project-bottom"><span className="more-work-tech">{w.tech}</span><External href={w.repo}>View code</External></div>
                </article>)}
              </div>
              {filteredRepos.length === 0 && <div className="project-empty"><p>No projects match your search.</p><button onClick={() => { setRepoSearch(''); setRepoCategory('All'); }}>Clear filters</button></div>}
            </div>
          </div>
        </section>

        {/* ====================================================================
            SCREEN 08: CONTACT / DIRECT DISPATCH TERMINAL
            ==================================================================== */}
        <section
          data-screen="7"
          className={`screen-slide ${getScreenTransitionClass(7)}`}
          inert={intro || activeScreen !== 7 || undefined}
          aria-hidden={activeScreen !== 7}
        >
          <div
            key={activeScreen === 7 ? "contact-open" : "contact-idle"}
            className="contact-paper"
            style={{
              position: 'relative',
              maxWidth: '920px',
              margin: 'auto',
              background: 'color-mix(in srgb, var(--background) 92%, transparent)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(16px)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <img
              className="contact-portrait"
              src="/images/kamalakar-portrait.jpg"
              alt="Portrait of Kamalakar Reddy Gorantla"
              aria-hidden="true"
            />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <span className="eyebrow" style={{ color: 'var(--primary)', display: 'block', marginBottom: '14px' }}>
                CONTACT
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-serif), Georgia, serif",
                  fontSize: 'clamp(42px, 6vw, 84px)',
                  fontWeight: 400,
                  lineHeight: 0.95,
                  letterSpacing: '-0.06em',
                  margin: '0 0 20px',
                }}
              >
                GET IN<br />
                TOUCH<span>↗</span>
              </h2>
              <p style={{ fontSize: '16px', lineHeight: 1.5, color: 'var(--muted-foreground)', maxWidth: '520px', margin: '0 0 35px' }}>
                For project inquiries and collaboration, get in touch.
              </p>
              <div className="contact-grid">
                <div>
                  <span className="eyebrow">DIRECT CONTACT</span>
                  <a className="email-address" href={`mailto:${profile.email}`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                    {profile.email}
                  </a>
                  <button
                    type="button"
                    className={`copy-button ${copied ? "copy-success" : ""}`} aria-live="polite"
                    onClick={copyEmail}
                  >
                    {copied ? '✓ TRANSMITTED' : 'Copy email ↗'}
                  </button>
                </div>
                <div>
                  <span className="eyebrow">PROFILES & RESUME</span>
                  <External href={profile.github}>GitHub</External>
                  <External href={profile.linkedin}>LinkedIn</External>
                  <External href={profile.resume}>Resume PDF</External>
                </div>
              </div>
              <div style={{ marginTop: '35px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-geist-mono), monospace', color: 'var(--muted-foreground)' }}>
                <span>KAMALAKAR REDDY GORANTLA · BENGALURU, INDIA</span>
                <span>IST (UTC+05:30) · {time || '12:00'}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Project Deep Dive Fullscreen Environment */}
      {deepDiveProject && (
        <div className="project-deep-dive" role="dialog" aria-modal="true" aria-label={`${deepDiveProject.name} Architecture Deep Dive`}>
          <button
            type="button"
            className="deep-dive-close-btn"
            onClick={() => setDeepDiveProject(null)}
          >
            <span>← RETURN TO SYSTEMS [ESC]</span>
          </button>

          <header className="project-heading" style={{ paddingTop: '20px' }}>
            <span className="eyebrow">03 / FLAGSHIP SYSTEM ARCHITECTURE</span>
            <h1>
              {deepDiveProject.name}
              <span>®</span>
            </h1>
          </header>

          {/* 3D Interactive Hero */}
          <section className="project-3d-hero">
            <WebGLHost
              build={PROJECT_SCENE[deepDiveProject.slug] ?? neuralTunnel}
              accent={PROJECT_THEME_COLORS[theme][deepDiveProject.slug]?.color ?? deepDiveProject.color}
              ink={PROJECT_THEME_COLORS[theme][deepDiveProject.slug]?.ink ?? deepDiveProject.ink}
              interactive={true}
            />
            <div className="project-3d-hud" aria-hidden="true">
              <div className="hud-top-row">
                <span className="hud-tag">
                  <i className="live-dot" />
                  <span>{PROJECT_3D_SPECS[deepDiveProject.slug]?.tag ?? 'LIVE AGENT SYSTEM'}</span>
                </span>
                <span className="hud-tag hud-topology">
                  <span>TOPOLOGY: {PROJECT_3D_SPECS[deepDiveProject.slug]?.topology ?? 'DISTRIBUTED LATTICE'}</span>
                </span>
              </div>
              <div className="hud-bottom-row">
                <span className="hud-orbit-hint">✥ CLICK & DRAG TO ORBIT 360°</span>
                <span className="hud-tag">
                  <span>RUNTIME: {PROJECT_3D_SPECS[deepDiveProject.slug]?.runtime ?? 'DETERMINISTIC PIPELINE'}</span>
                </span>
              </div>
            </div>
          </section>

          {/* 01 / Architecture */}
          <Reveal className="section-kicker">
            <span>01 / SYSTEM ARCHITECTURE</span>
            <h2>Agent Orchestration & Flow Graph</h2>
          </Reveal>
          <AgentWalkthrough project={deepDiveProject} />

          {/* Interactive Node Graph & Stage Visualizer */}
          <Reveal className="section-kicker" style={{ marginTop: '70px' }}>
            <span>02 / INTERACTIVE STAGE INSPECTOR</span>
            <h2>Probing Node Topology & Live Execution</h2>
          </Reveal>
          <div style={{ marginTop: '24px' }}>
            <InteractiveArchitecture project={deepDiveProject} theme={theme} />
          </div>

          {/* 03 / About the System */}
          <Reveal className="section-kicker" style={{ marginTop: '70px' }}>
            <span>03 / ABOUT THE SYSTEM</span>
            <h2>Core Mission & Technical Stack</h2>
          </Reveal>
          <section className="project-overview" style={{ paddingTop: '35px' }}>
            <div>
              <span className="eyebrow">THE ARCHITECTURE</span>
              <h2>{deepDiveProject.headline}</h2>
            </div>
            <div>
              <p>{deepDiveProject.description}</p>
              <div className="project-links">
                {deepDiveProject.live && (
                  <External href={deepDiveProject.live}>View live</External>
                )}
                <External href={deepDiveProject.repo}>Explore repository</External>
              </div>
            </div>
            <dl>
              <div>
                <dt>Role</dt>
                <dd>
                  Architecture & Engineering<br />
                  Backend & frontend
                </dd>
              </div>
              <div>
                <dt>Stage</dt>
                <dd>{deepDiveProject.tag}</dd>
              </div>
              <div>
                <dt>Stack</dt>
                <dd>{deepDiveProject.stack.join(' · ')}</dd>
              </div>
            </dl>
          </section>

          {/* 04 / Technical Details */}
          <section className="project-story">
            <Reveal className="story-stat">
              <strong>{deepDiveProject.metric}</strong>
              <span>{deepDiveProject.metricLabel}</span>
              <div className="case-metrics"><div><strong>{deepDiveProject.flow.length}</strong><span>Workflow stages</span></div><div><strong>{deepDiveProject.stack.length}</strong><span>Stack technologies</span></div></div>
            </Reveal>
            <div>
              {deepDiveProject.features.map(([heading, text], i) => (
                <Reveal key={heading} className="feature-row">
                  <span>{pad(i + 1)}</span>
                  <div>
                    <h3>{heading}</h3>
                    <p>{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <Reveal className="implementation-note">
            <span className="eyebrow">IMPLEMENTATION SCOPE & CONSTRAINTS</span>
            <h2>Architectural boundaries.</h2>
            <p>{deepDiveProject.boundary}</p>
            <External
              href={`${deepDiveProject.repo}/blob/${deepDiveProject.branch}/${deepDiveProject.evidence}`}
            >
              Read the implementation
            </External>
          </Reveal>

          <div className="next-project">
            <span className="eyebrow">NEXT SYSTEM</span>
            <button
              type="button"
              style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontSize: "clamp(36px, 8vw, 130px)",
                letterSpacing: "-0.07em",
                lineHeight: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                background: "none",
                border: 0,
                color: "inherit",
                cursor: "pointer",
                padding: "20px 0",
              }}
              onClick={() => {
                const nextIdx = wrap(projects.indexOf(deepDiveProject) + 1, projects.length);
                setDeepDiveProject(projects[nextIdx]);
                setActiveProjectIdx(nextIdx);
              }}
            >
              <RollingText>
                {projects[wrap(projects.indexOf(deepDiveProject) + 1, projects.length)].name}
              </RollingText>
              <span style={{ color: 'var(--primary)' }}>↗</span>
            </button>
          </div>
        </div>
      )}

      {/* Persistent Bottom Telemetry & Navigation Bar */}
      <footer className="hud-bottom-telemetry">
        <div>
          <span>BENGALURU, IN</span>
        </div>
        <div className="hud-telemetry-hint">
          <span>NAVIGATE:</span>
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <span>SCROLL</span>
          <span style={{ margin: '0 4px', opacity: 0.4 }}>|</span>
          <kbd>1-8</kbd>
          <span>DIRECT</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <External href={profile.github}>GitHub</External>
          <External href={profile.resume}>Resume</External>
          <button
            type="button"
            onClick={() => goToScreen(7)}
            style={{ color: 'inherit', background: 'none', border: 0, cursor: 'pointer', font: 'inherit' }}
          >
            Contact ↗
          </button>
        </div>
      </footer>

      {/* Screen Progress Bar */}
      <div className="hud-progress-meter">
        <div
          className="hud-progress-fill"
          style={{ width: `${((activeScreen + 1) / SCREENS.length) * 100}%` }}
        />
      </div>

      {/* Overlays (Menu, Process, Reel, Lightbox) */}
      <Dialog
        open={overlay !== null}
        onOpenChange={(open) => {
          if (!open) setOverlay(null);
        }}
      >
        <DialogContent
          className={`portfolio-dialog overlay-${overlay}`}
          showCloseButton={false}
          finalFocus={(closeType) => closeType === 'keyboard'}
          style={overlay === 'menu' ? {
            position: 'fixed',
            inset: 0,
            width: '100vw',
            maxWidth: 'none',
            height: '100dvh',
            maxHeight: '100dvh',
            transform: 'none',
            translate: 'none',
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          } : undefined}
        >
          <DialogClose className="overlay-close">
            Close <span>×</span>
          </DialogClose>

          {overlay === 'menu' && (
            <>
              <DialogTitle className="menu-title">Navigation</DialogTitle>
              <DialogDescription className="menu-caption">
                AI Systems Engineer · Bengaluru<br />
                Multi-agent systems, RAG & production engineering
              </DialogDescription>
              <nav id="site-navigation" className="overlay-nav" aria-label="Expanded navigation">
                {navigation}
              </nav>
              <div className="menu-scene">
                <Suspense fallback={null}>
                  <AgentField isLight={theme === 'white'} />
                </Suspense>
              </div>
              <div className="menu-bottom">
                <div
                  className="menu-theme-toggle"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-geist-mono), monospace' }}>
                    {theme === 'white' ? 'White BG' : 'Dark BG'}
                  </span>
                  <Switch
                    checked={theme === 'white'}
                    onCheckedChange={toggleTheme}
                    aria-label="Toggle white background"
                    size="sm"
                  />
                </div>
                <External href={profile.github}>GitHub</External>
                <a href={profile.resume} target="_blank" rel="noreferrer">
                  Resume ↗
                </a>
                <span>KAMALAKAR REDDY GORANTLA // AI SYSTEMS ENGINEER</span>
              </div>
            </>
          )}

          {overlay === 'process' && (
            <MethodologyConsole
              onClose={() => setOverlay(null)}
              onGoToWork={() => {
                setOverlay(null);
                goToScreen(3);
              }}
            />
          )}

          {overlay === 'reel' && (
            <>
              <DialogTitle className="sr-only">Systems reel</DialogTitle>
              <DialogDescription className="reel-kicker">
                KAMALAKAR REDDY GORANTLA / SYSTEMS ARCHITECTURE
              </DialogDescription>
              <div className="reel-stage" key={reelStep}>
                {reelStep === 0 ? (
                  <>
                    <img
                      src="/images/portfolio-library/P12-artwork.png"
                      alt="Kamalakar Reddy Gorantla — AI Systems Architecture"
                    />
                    <div className="reel-title">
                      <small>AI SYSTEMS ENGINEER</small>
                      <h2>
                        System<br />
                        Overview.
                      </h2>
                    </div>
                  </>
                ) : (
                  <ProjectCover project={projects[reelStep - 1]} reel />
                )}
              </div>
              <div className="reel-controls">
                <button
                  type="button"
                  onClick={() => setPlaying(!playing)}
                  aria-label={playing ? 'Pause reel' : 'Play reel'}
                >
                  {playing ? 'Ⅱ Pause' : '▶ Play'}
                </button>
                <div>
                  {Array.from({ length: projects.length + 1 }, (_, i) => i).map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Show reel frame ${i + 1}`}
                      onClick={() => setReelStep(i)}
                      className={i === reelStep ? 'current' : ''}
                    >
                      <span />
                    </button>
                  ))}
                </div>
                <span>
                  {pad(reelStep + 1)} / {pad(projects.length + 1)}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog
        open={lightbox !== null}
        onOpenChange={(open) => {
          if (!open) setLightbox(null);
        }}
      >
        <DialogContent
          className="portfolio-dialog lightbox"
          showCloseButton={false}
          finalFocus={(closeType) => closeType === 'keyboard'}
        >
          {lightbox !== null && (
            <>
              <DialogClose className="overlay-close">Close ×</DialogClose>
              <DialogTitle className="lightbox-title">
                {gallery[lightbox].title}
              </DialogTitle>
              <div className="lightbox-frame" key={lightbox}>
                {gallery[lightbox].scene && PLAYGROUND_SCENE[gallery[lightbox].scene] ? (
                  <div className="lightbox-webgl-wrapper">
                    <WebGLHost
                      className="lightbox-scene"
                      build={PLAYGROUND_SCENE[gallery[lightbox].scene].build}
                      accent={PLAYGROUND_SCENE[gallery[lightbox].scene].accent}
                      ink={PLAYGROUND_SCENE[gallery[lightbox].scene].ink}
                      interactive={true}
                    />
                    <div className="lightbox-3d-hud" aria-hidden="true">
                      <span>
                        ✥ CLICK & DRAG TO ORBIT 360° · DOUBLE-CLICK TO RESET
                      </span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={gallery[lightbox].caption}
                    alt={gallery[lightbox].title}
                  />
                )}
              </div>
              <DialogDescription>{gallery[lightbox].caption}</DialogDescription>
              <button
                type="button"
                className="lightbox-prev"
                aria-label="Previous image"
                onClick={() =>
                  setLightbox((i) => wrap((i ?? 0) - 1, gallery.length))
                }
              >
                ←
              </button>
              <button
                type="button"
                className="lightbox-next"
                aria-label="Next image"
                onClick={() =>
                  setLightbox((i) => wrap((i ?? 0) + 1, gallery.length))
                }
              >
                →
              </button>
              <span className="lightbox-count">
                {pad(lightbox + 1)} / {pad(gallery.length)}
              </span>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
