import { build as rasenganChidori } from './scenes/playground/rasengan-chidori';
import { build as ironMan } from './scenes/playground/iron-man';
import { build as thor } from './scenes/playground/thor';
import type { SceneBuilder } from './scene-types';

export const PLAYGROUND_SCENE: Record<string, { build: SceneBuilder; accent: string; ink: string }> = {
  'rasengan-chidori': { build: rasenganChidori, accent: '#9eafda', ink: '#182139' },
  'iron-man': { build: ironMan, accent: '#ee633f', ink: '#25130d' },
  thor: { build: thor, accent: '#c8eb66', ink: '#171b18' },
};
