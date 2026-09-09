import { build as ragGraph } from './scenes/rag-graph';
import { build as agentSwarm } from './scenes/agent-swarm';
import { build as agenticOrbit } from './scenes/agentic-orbit';
import { build as dataRiver } from './scenes/data-river';
import { build as neuralSphere } from './scenes/neural-sphere';
import type { SceneBuilder } from './scene-types';

// THREEJS-ANIMATION-PLAN.md §4 "Reference → placement mapping" — one hero
// scene per flagship project, matched to what that project actually does.
export const PROJECT_SCENE: Record<string, SceneBuilder> = {
  atlas: ragGraph,
  researchforge: agentSwarm,
  forgeguard: agenticOrbit,
  aperture: dataRiver,
  'workforce-ai': neuralSphere,
};
