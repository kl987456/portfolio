'use client';

import { WebGLHost } from '@/components/webgl/webgl-host';
import { build as neuralTunnel } from '@/components/webgl/scenes/neural-tunnel';

export function NotFoundScene() {
  return <WebGLHost build={neuralTunnel} accent="#e34a39" ink="#171b18" />;
}
