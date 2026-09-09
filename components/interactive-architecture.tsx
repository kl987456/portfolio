'use client';

import { useState } from 'react';
import type { Project } from '@/lib/portfolio-data';

interface ArchitectureNode {
  id: string;
  label: string;
  role: string;
  type: 'input' | 'agent' | 'supervisor' | 'evaluator' | 'gate' | 'output';
  details: string;
  boundary: string;
  x: number;
  y: number;
}

interface ArchitectureWire {
  from: string;
  to: string;
  label?: string;
}

interface SystemTopology {
  tagline: string;
  nodes: ArchitectureNode[];
  wires: ArchitectureWire[];
}

const TOPOLOGIES: Record<string, SystemTopology> = {
  atlas: {
    tagline: 'Self-Correcting Agentic RAG with Pre-Generation Relevance Grading',
    nodes: [
      {
        id: 'query',
        label: 'QUERY UNDERSTANDING',
        role: 'Input Analyst',
        type: 'input',
        details: 'Parses intent, resolves coreferences, and expands acronyms into multi-vector search terms.',
        boundary: 'Max query length 512 tokens; rejects malformed inputs.',
        x: 60,
        y: 130,
      },
      {
        id: 'retrieval',
        label: 'PGVECTOR RETRIEVAL',
        role: 'Semantic Vector Probe',
        type: 'agent',
        details: 'Cosine similarity top-K search across HNSW-indexed document embeddings.',
        boundary: 'Top-K capped at 6 chunks with cosine distance < 0.35.',
        x: 200,
        y: 130,
      },
      {
        id: 'grader',
        label: 'RELEVANCE GRADER',
        role: 'Quality Gate & Bounded Retry',
        type: 'evaluator',
        details: 'Evaluates chunk relevance against the query before answer synthesis. Triggers bounded retry if relevance < 0.7.',
        boundary: 'Maximum 2 retry rounds; fails gracefully if evidence threshold unmet.',
        x: 350,
        y: 70,
      },
      {
        id: 'generator',
        label: 'ANSWER GENERATOR',
        role: 'Synthesis Specialist',
        type: 'agent',
        details: 'Drafts candidate answer strictly bound to the verified chunk IDs.',
        boundary: 'Temperature 0.1; zero ungrounded speculative tokens allowed.',
        x: 490,
        y: 130,
      },
      {
        id: 'validator',
        label: 'CITATION VALIDATOR',
        role: 'Hallucination Checker',
        type: 'evaluator',
        details: 'Bidirectional claim-to-chunk verification ensuring every sentence maps to a verified source.',
        boundary: 'Unsubstantiated claims are struck before client delivery.',
        x: 630,
        y: 130,
      },
      {
        id: 'output',
        label: 'VERIFIED DISPATCH',
        role: 'Response Payload',
        type: 'output',
        details: 'Emits structured response with markdown formatting, confidence scores, and chunk citations.',
        boundary: 'Cryptographically signed response payload.',
        x: 770,
        y: 130,
      },
    ],
    wires: [
      { from: 'query', to: 'retrieval', label: 'vectors' },
      { from: 'retrieval', to: 'grader', label: 'chunks' },
      { from: 'grader', to: 'generator', label: 'verified context' },
      { from: 'generator', to: 'validator', label: 'draft answer' },
      { from: 'validator', to: 'output', label: 'cited payload' },
    ],
  },
  researchforge: {
    tagline: 'Parallel Specialist Orchestration with Bounded Multi-Round Critique',
    nodes: [
      {
        id: 'brief',
        label: 'RESEARCH BRIEF',
        role: 'Mission Spec',
        type: 'input',
        details: 'Structured research question, hypothesis, scope constraints, and required evidence depth.',
        boundary: 'Bounded scope definition with explicit domain ceiling.',
        x: 60,
        y: 130,
      },
      {
        id: 'supervisor',
        label: 'SUPERVISOR CORE',
        role: 'Orchestrator',
        type: 'supervisor',
        details: 'Decomposes brief into parallel sub-tasks and dispatches to concurrent specialist channels.',
        boundary: 'Enforces concurrency limits and timeout ceilings per sub-agent.',
        x: 210,
        y: 130,
      },
      {
        id: 'web_agent',
        label: 'WEB SPECIALIST',
        role: 'Live Web Scraping',
        type: 'agent',
        details: 'Extracts real-time web articles, docs, and benchmarks concurrently.',
        boundary: 'Domain whitelist; rate-limited HTTP client.',
        x: 380,
        y: 50,
      },
      {
        id: 'docs_agent',
        label: 'DOCUMENT SPECIALIST',
        role: 'Corpus Analysis',
        type: 'agent',
        details: 'Analyzes PDF papers, whitepapers, and local technical documentation.',
        boundary: 'Text chunking with overlap; memory bounded.',
        x: 380,
        y: 130,
      },
      {
        id: 'data_agent',
        label: 'DATABASE SPECIALIST',
        role: 'SQL & Telemetry',
        type: 'agent',
        details: 'Queries internal telemetry tables and structured CSV/Parquet records.',
        boundary: 'Read-only queries; query execution timeout 4.0s.',
        x: 380,
        y: 210,
      },
      {
        id: 'synthesis',
        label: 'EVIDENCE SYNTHESIS',
        role: 'Cross-Channel Fusion',
        type: 'agent',
        details: 'Fuses parallel channel outputs into a unified structured report with consensus scoring.',
        boundary: 'Reconciles conflicting statements; assigns confidence intervals.',
        x: 550,
        y: 130,
      },
      {
        id: 'critic',
        label: 'BOUNDED CRITIC',
        role: 'Completeness Evaluator',
        type: 'evaluator',
        details: 'Evaluates report completeness, logic rigor, and source diversity; bounded to max 2 loops.',
        boundary: 'Strict 2-round recursion limit prevents infinite loops.',
        x: 710,
        y: 130,
      },
    ],
    wires: [
      { from: 'brief', to: 'supervisor' },
      { from: 'supervisor', to: 'web_agent' },
      { from: 'supervisor', to: 'docs_agent' },
      { from: 'supervisor', to: 'data_agent' },
      { from: 'web_agent', to: 'synthesis' },
      { from: 'docs_agent', to: 'synthesis' },
      { from: 'data_agent', to: 'synthesis' },
      { from: 'synthesis', to: 'critic' },
    ],
  },
  forgeguard: {
    tagline: 'Supervised Multi-Agent Engineering with Explicit Human Gatekeeping',
    nodes: [
      {
        id: 'issue',
        label: 'GITHUB ISSUE',
        role: 'Task Origin',
        type: 'input',
        details: 'Bug description, feature request, stack traces, and affected repository branch.',
        boundary: 'Repository boundary check; verified issue format.',
        x: 60,
        y: 130,
      },
      {
        id: 'analyst',
        label: 'REPOSITORY ANALYST',
        role: 'AST Code Parser',
        type: 'agent',
        details: 'Traverses codebase dependencies, imports, and symbol definitions to isolate the fault.',
        boundary: 'Read-only AST traversal; file extension boundaries (.py, .ts).',
        x: 200,
        y: 130,
      },
      {
        id: 'planner',
        label: 'WORKFLOW PLANNER',
        role: 'Step Architect',
        type: 'supervisor',
        details: 'Generates step-by-step patch strategy and test plan before any code modification.',
        boundary: 'File modification inventory ceiling of 4 files per task.',
        x: 340,
        y: 130,
      },
      {
        id: 'patcher',
        label: 'PATCH & TEST PROPOSER',
        role: 'Code Generator',
        type: 'agent',
        details: 'Drafts minimal code diffs alongside new unit test cases with Pytest.',
        boundary: 'Diffs staged in isolated sandboxed branch; no production commit.',
        x: 480,
        y: 130,
      },
      {
        id: 'review',
        label: 'REVIEW PACKAGE',
        role: 'Artifact Bundler',
        type: 'evaluator',
        details: 'Assembles analysis, plan, patch preview, test results, and impact analysis into 5 inspectable artifacts.',
        boundary: 'Packages everything into an inspectable review envelope.',
        x: 620,
        y: 130,
      },
      {
        id: 'gate',
        label: 'HUMAN APPROVAL GATE',
        role: 'Deterministic Gatekeeper',
        type: 'gate',
        details: 'JWT-protected human operator authorization interface. The system CANNOT execute without signature.',
        boundary: 'Cryptographic JWT signature required for workflow state advance.',
        x: 760,
        y: 130,
      },
    ],
    wires: [
      { from: 'issue', to: 'analyst' },
      { from: 'analyst', to: 'planner' },
      { from: 'planner', to: 'patcher' },
      { from: 'patcher', to: 'review' },
      { from: 'review', to: 'gate' },
    ],
  },
  aperture: {
    tagline: 'Traced SQL Analytics Engine with Abstract Syntax Tree Validation',
    nodes: [
      {
        id: 'question',
        label: 'NATURAL LANGUAGE',
        role: 'Business Query',
        type: 'input',
        details: 'User analytical question in plain English (e.g. "Quarterly revenue trend across EMEA").',
        boundary: 'Input sanitization against prompt injection.',
        x: 70,
        y: 130,
      },
      {
        id: 'planner',
        label: 'SCHEMA & PLANNER',
        role: 'AST Schema Mapper',
        type: 'supervisor',
        details: 'Maps query intent to table catalogs, foreign keys, and normalized metrics.',
        boundary: 'Bundled sales schema boundary; zero out-of-catalog access.',
        x: 220,
        y: 130,
      },
      {
        id: 'validator',
        label: 'SQLGLOT AST VALIDATOR',
        role: 'Safety Firewall',
        type: 'gate',
        details: 'Parses the raw query tree using SQLGlot to strictly reject mutations (DROP, INSERT, UPDATE, DELETE).',
        boundary: 'Only single read-only SELECT statement allowed; enforces 500-row limit.',
        x: 390,
        y: 130,
      },
      {
        id: 'engine',
        label: 'READ EXECUTION',
        role: 'Sandboxed Postgres',
        type: 'agent',
        details: 'Runs validated SQL against read-only replica with query timeout budget.',
        boundary: 'Execution timeout 3.0s; 500-row hard cap.',
        x: 550,
        y: 130,
      },
      {
        id: 'evidence',
        label: 'EVIDENCE & CHARTS',
        role: 'Traced Analyst',
        type: 'output',
        details: 'Extracts tabular evidence rows, computes Pandas statistical aggregates, and emits executive chart specs.',
        boundary: 'Retains raw evidence rows for complete mathematical auditability.',
        x: 720,
        y: 130,
      },
    ],
    wires: [
      { from: 'question', to: 'planner' },
      { from: 'planner', to: 'validator' },
      { from: 'validator', to: 'engine' },
      { from: 'engine', to: 'evidence' },
    ],
  },
  'workforce-ai': {
    tagline: 'Autonomous Voice AI Telephony & Talent Pipeline Orchestration',
    nodes: [
      {
        id: 'webhook',
        label: 'TELEPHONY WEBHOOK',
        role: 'Inbound Event Bus',
        type: 'input',
        details: 'Receives asynchronous phone screening status, recordings, and Hunar Voice AI transcripts.',
        boundary: 'Asynchronous event stream with variable network latency.',
        x: 70,
        y: 130,
      },
      {
        id: 'hmac',
        label: 'HMAC-SHA256 GATE',
        role: 'Cryptographic Auth',
        type: 'gate',
        details: 'Validates cryptographic payload signatures and millisecond timestamps against untrusted webhooks.',
        boundary: 'Rejects replay attacks and invalid HMAC signatures.',
        x: 230,
        y: 130,
      },
      {
        id: 'reconciler',
        label: 'CALL RECONCILER',
        role: 'State Normalizer',
        type: 'agent',
        details: 'Unifies recording URLs, acoustic metrics, transcript turns, and AI evaluations into 1 call record.',
        boundary: 'Idempotent state reconciliation preventing duplicate calls.',
        x: 400,
        y: 130,
      },
      {
        id: 'rules',
        label: '8 RULE AUTOMATIONS',
        role: 'Deterministic Engine',
        type: 'supervisor',
        details: 'Executes auto-dialing, triage, retry ceilings, cross-pipeline sync, and do-not-contact suppression.',
        boundary: 'Explicit rule matrix; deterministic state transitions.',
        x: 570,
        y: 130,
      },
      {
        id: 'pipeline',
        label: 'PIPELINE DISPATCH',
        role: 'Recruiting Console',
        type: 'output',
        details: 'Updates live candidate stages, triggers notification webhooks, and synchronizes ATS requisitions.',
        boundary: 'Audit log logged with trace IDs.',
        x: 740,
        y: 130,
      },
    ],
    wires: [
      { from: 'webhook', to: 'hmac' },
      { from: 'hmac', to: 'reconciler' },
      { from: 'reconciler', to: 'rules' },
      { from: 'rules', to: 'pipeline' },
    ],
  },
};

export function InteractiveArchitecture({
  project,
  theme = 'dark',
}: {
  project: Project;
  theme?: 'dark' | 'white';
}) {
  const topo = TOPOLOGIES[project.slug] ?? TOPOLOGIES.atlas;
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(
    topo.nodes[0] ?? null,
  );
  const [hoveredNode, setHoveredNode] = useState<ArchitectureNode | null>(null);

  const activeNode = hoveredNode || selectedNode || topo.nodes[0];
  const accentColor = project.color;

  return (
    <div
      className="interactive-architecture-container"
      style={{
        width: '100%',
        background:
          theme === 'white'
            ? 'rgba(255, 255, 255, 0.85)'
            : 'rgba(8, 12, 18, 0.85)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '24px',
        backdropFilter: 'blur(16px)',
        margin: '30px 0 50px',
        boxShadow:
          theme === 'white'
            ? '0 12px 40px rgba(0,0,0,0.04)'
            : '0 20px 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header telemetry */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '14px',
          marginBottom: '20px',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '11px',
          letterSpacing: '0.08em',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: accentColor,
              boxShadow: `0 0 8px ${accentColor}`,
            }}
          />
          <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>
            {project.name.toUpperCase()} // AGENT TOPOLOGY GRAPH
          </span>
        </div>
        <span style={{ color: 'var(--muted-foreground)' }}>
          {topo.tagline}
        </span>
      </div>

      {/* SVG Canvas for Topology Graph */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '10px 0',
        }}
      >
        <svg
          viewBox="0 0 840 260"
          style={{
            width: '100%',
            minWidth: '680px',
            height: 'auto',
            display: 'block',
          }}
          role="img"
          aria-label={`${project.name} interactive agent topology graph`}
        >
          <defs>
            <linearGradient id={`wire-grad-${project.slug}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.3" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.3" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render Connection Wires */}
          {topo.wires.map((wire, idx) => {
            const fromNode = topo.nodes.find((n) => n.id === wire.from);
            const toNode = topo.nodes.find((n) => n.id === wire.to);
            if (!fromNode || !toNode) return null;

            const isHighlighted =
              activeNode?.id === fromNode.id || activeNode?.id === toNode.id;

            // Curved cubic bezier wire
            const midX = (fromNode.x + toNode.x) / 2;
            const pathD = `M ${fromNode.x} ${fromNode.y} C ${midX} ${fromNode.y}, ${midX} ${toNode.y}, ${toNode.x} ${toNode.y}`;

            return (
              <g key={`${wire.from}-${wire.to}-${idx}`}>
                {/* Background base wire */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={theme === 'white' ? '#cbd5e1' : '#1e293b'}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                {/* Animated active telemetry pulse wire */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isHighlighted ? accentColor : `url(#wire-grad-${project.slug})`}
                  strokeWidth={isHighlighted ? '2.5' : '1.5'}
                  strokeDasharray="8 12"
                  className="map-wire"
                  style={{ opacity: isHighlighted ? 1 : 0.6 }}
                />
              </g>
            );
          })}

          {/* Render Nodes */}
          {topo.nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const isActive = isSelected || isHovered;

            const isGate = node.type === 'gate';
            const isSupervisor = node.type === 'supervisor';
            const radius = isSupervisor ? 30 : isGate ? 28 : 24;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedNode(node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Halo if active */}
                {isActive && (
                  <circle
                    r={radius + 8}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    style={{ animation: 'slow-spin 8s linear infinite' }}
                  />
                )}

                {/* Outer Ring */}
                <circle
                  r={radius}
                  fill={
                    theme === 'white'
                      ? isActive
                        ? '#f1f5f9'
                        : '#ffffff'
                      : isActive
                      ? '#0f172a'
                      : '#050811'
                  }
                  stroke={isActive ? accentColor : theme === 'white' ? '#94a3b8' : '#334155'}
                  strokeWidth={isActive ? '2.5' : '1.5'}
                  filter={isActive ? 'url(#glow)' : undefined}
                  style={{ transition: 'all 0.3s ease' }}
                />

                {/* Center Glyph or Dot */}
                <circle
                  r={isGate ? 6 : 4}
                  fill={isGate ? '#ef4444' : isActive ? accentColor : '#94a3b8'}
                />

                {/* Node Label Text */}
                <text
                  y={radius + 18}
                  textAnchor="middle"
                  fill="var(--foreground)"
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '9px',
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.06em',
                  }}
                >
                  {node.label}
                </text>

                <text
                  y={radius + 30}
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '8px',
                    letterSpacing: '0.04em',
                  }}
                >
                  {node.role}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Live Node Inspector Callout */}
      {activeNode && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px 20px',
            background:
              theme === 'white'
                ? 'rgba(241, 245, 249, 0.85)'
                : 'rgba(15, 23, 42, 0.75)',
            border: `1px solid ${accentColor}`,
            borderRadius: '4px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 2fr 1.5fr',
            gap: '20px',
            alignItems: 'center',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '11px',
            animation: 'fade-slide 0.35s ease both',
          }}
        >
          <div>
            <span
              style={{
                color: accentColor,
                display: 'block',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                marginBottom: '4px',
              }}
            >
              STAGE SPECIFICATION
            </span>
            <strong
              style={{
                color: 'var(--foreground)',
                fontSize: '14px',
                fontFamily: 'var(--font-serif), Georgia, serif',
                letterSpacing: '-0.02em',
              }}
            >
              {activeNode.label}
            </strong>
            <span
              style={{
                display: 'block',
                color: 'var(--muted-foreground)',
                fontSize: '10px',
                marginTop: '2px',
              }}
            >
              ROLE: {activeNode.role.toUpperCase()}
            </span>
          </div>

          <div>
            <span
              style={{
                color: 'var(--muted-foreground)',
                fontSize: '10px',
                letterSpacing: '0.08em',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              EXECUTION LOGIC
            </span>
            <p
              style={{
                margin: 0,
                color: 'var(--foreground)',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              {activeNode.details}
            </p>
          </div>

          <div>
            <span
              style={{
                color: '#ef4444',
                fontSize: '10px',
                letterSpacing: '0.08em',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              CAPABILITY BOUNDARY
            </span>
            <span
              style={{
                color: 'var(--muted-foreground)',
                fontSize: '11px',
                lineHeight: 1.4,
                display: 'block',
              }}
            >
              {activeNode.boundary}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
