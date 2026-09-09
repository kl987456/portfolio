'use client';
import { useEffect, useRef, useState } from 'react';

export function HeroName({ active }: { active: boolean }) {
  const name = 'KAMALAKAR\nREDDY\nGORANTLA';
  const [count, setCount] = useState(name.length);
  useEffect(() => {
    let count = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frame = requestAnimationFrame(() => setCount(!active || reduced ? name.length : 0));
    const timer = setInterval(() => {
      count = !active || reduced ? name.length : count + 1;
      setCount(Math.min(count, name.length));
      if (count >= name.length) clearInterval(timer);
    }, 65);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); };
  }, [active]);
  return (
    <span className="typewriter-name" aria-label="Kamalakar Reddy Gorantla">
      <span className="typewriter-reserve" aria-hidden="true">
        {name}
      </span>
      <span className="typewriter-ink" aria-hidden="true">
        {name.slice(0, count)}
        <i />
      </span>
    </span>
  );
}
export function VisionLabels({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      !active ||
      matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches
    )
      return;
    const move = (event: PointerEvent) => {
      ref.current?.style.setProperty(
        '--hud-x',
        `${(event.clientX / innerWidth - 0.5) * 24}px`,
      );
      ref.current?.style.setProperty(
        '--hud-y',
        `${(event.clientY / innerHeight - 0.5) * 18}px`,
      );
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [active]);
  return (
    <div ref={ref} className="vision-floating-labels" aria-hidden="true">
      {['AGENT MESH ↗', 'RAG PIPELINE', 'HUMAN GATE'].map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}
export function AmbientTerminal() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnabled(!media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return enabled ? (
    <video
      className="ambient-terminal"
      src="/video/terminal-loop.mp4"
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  ) : null;
}

