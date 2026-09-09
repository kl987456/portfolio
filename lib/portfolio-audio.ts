// Ambient soundtrack for the portfolio, driven by the header Audio switch.
//
// Each view gets its own track. Drop files into `public/audio/` using the
// names in TRACKS below; anything missing falls back to `theme.mp3`, and if
// no file at all is reachable the switch plays a generated chord bed instead.
//
// Playback never starts on its own — only when the visitor turns the switch
// on — and every track stops itself after PLAY_LIMIT_MS, reporting back
// through `onAutoStop` so the switch returns to "off".

export const TRACKS = {
  work: '/audio/work.mp3',
  systems: '/audio/systems.mp3',
  about: '/audio/about.mp3',
  playground: '/audio/playground.mp3',
  hobbies: '/audio/hobbies.mp3',
  project: '/audio/project.mp3',
} as const;

export const FALLBACK_TRACK = '/audio/theme.mp3';

export type AudioScene = keyof typeof TRACKS;
export type AudioSource = 'track' | 'generated' | 'off';

/** How long any one track plays before switching itself off. */
export const PLAY_LIMIT_MS = 30_000;

const TRACK_VOLUME = 0.32;
const FADE_IN_MS = 1400;
const FADE_OUT_MS = 700;
const GENERATED_GAIN = 0.055;
const CHORD_SECONDS = 7;
// Am - F - C - G, voiced low so it sits under the page rather than over it.
const CHORDS = [
  [110.0, 130.81, 164.81],
  [87.31, 130.81, 174.61],
  [98.0, 130.81, 164.81],
  [98.0, 123.47, 146.83],
];

export type PortfolioAudio = {
  enable: (scene: AudioScene) => Promise<AudioSource>;
  disable: () => void;
  setScene: (scene: AudioScene) => void;
  cue: (kind: 'hover' | 'transition') => void;
  dispose: () => void;
};

export function createPortfolioAudio(onAutoStop?: () => void): PortfolioAudio {
  const elements = new Map<string, HTMLAudioElement>();
  const fades = new Map<HTMLAudioElement, ReturnType<typeof setInterval>>();
  const reachable = new Map<string, boolean>();
  let current: HTMLAudioElement | null = null;
  let currentSrc = '';
  let enabled = false;
  let operation = 0;
  let scene: AudioScene = 'work';
  let limitTimer: ReturnType<typeof setTimeout> | null = null;

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let voices: OscillatorNode[] = [];
  let chordTimer: ReturnType<typeof setInterval> | null = null;
  let chord = 0;

  const fadeTo = (
    el: HTMLAudioElement,
    target: number,
    ms: number,
    pauseAtEnd = false,
  ) => {
    const running = fades.get(el);
    if (running) clearInterval(running);
    const step = 40;
    const delta = (target - el.volume) / Math.max(1, ms / step);
    const timer = setInterval(() => {
      const next = el.volume + delta;
      const done = delta >= 0 ? next >= target : next <= target;
      el.volume = Math.min(1, Math.max(0, done ? target : next));
      if (!done) return;
      clearInterval(timer);
      fades.delete(el);
      if (pauseAtEnd) {
        el.pause();
        el.currentTime = 0;
      }
    }, step);
    fades.set(el, timer);
  };

  const stopGenerated = () => {
    if (chordTimer) {
      clearInterval(chordTimer);
      chordTimer = null;
    }
    if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  };

  const silence = () => {
    if (current && !current.paused) fadeTo(current, 0, FADE_OUT_MS, true);
    current = null;
    currentSrc = '';
    stopGenerated();
  };

  const clearLimit = () => {
    if (limitTimer) clearTimeout(limitTimer);
    limitTimer = null;
  };

  // Fade so the audio is gone at the limit rather than starting to fade there.
  const startLimit = () => {
    clearLimit();
    limitTimer = setTimeout(
      () => {
        limitTimer = null;
        enabled = false;
        silence();
        onAutoStop?.();
      },
      Math.max(0, PLAY_LIMIT_MS - FADE_OUT_MS),
    );
  };

  // Probe with HEAD so a missing file never surfaces as a media error.
  const isReachable = async (src: string) => {
    const cached = reachable.get(src);
    if (cached !== undefined) return cached;
    let ok = false;
    try {
      ok = (await fetch(src, { method: 'HEAD' })).ok;
    } catch {
      ok = false;
    }
    reachable.set(src, ok);
    return ok;
  };

  const resolveSrc = async (target: AudioScene) => {
    if (await isReachable(TRACKS[target])) return TRACKS[target];
    if (await isReachable(FALLBACK_TRACK)) return FALLBACK_TRACK;
    return null;
  };

  const elementFor = (src: string) => {
    let el = elements.get(src);
    if (!el) {
      el = new Audio(src);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0;
      elements.set(src, el);
    }
    return el;
  };

  const playTrack = async (src: string, valid: () => boolean) => {
    const next = elementFor(src);
    const previous = current;
    next.volume = 0;
    next.currentTime = 0;
    await next.play();
    if (!valid()) {
      next.pause();
      return false;
    }
    if (previous && previous !== next) fadeTo(previous, 0, FADE_OUT_MS, true);
    current = next;
    currentSrc = src;
    fadeTo(next, TRACK_VOLUME, FADE_IN_MS);
    startLimit();
    return true;
  };

  const setChord = (index: number, glide: number) => {
    if (!ctx) return;
    const notes = CHORDS[index % CHORDS.length];
    voices.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(
        notes[i % notes.length],
        ctx!.currentTime,
        glide,
      );
    });
  };

  const playGenerated = async (valid: () => boolean) => {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      const warmth = ctx.createBiquadFilter();
      warmth.type = 'lowpass';
      warmth.frequency.value = 900;
      master.connect(warmth);
      warmth.connect(ctx.destination);
      voices = CHORDS[0].map((hz, i) => {
        const osc = ctx!.createOscillator();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = hz;
        osc.detune.value = i * 3;
        const level = ctx!.createGain();
        level.gain.value = i === 0 ? 1 : 0.45;
        osc.connect(level);
        level.connect(master!);
        osc.start();
        return osc;
      });
    }
    await ctx.resume();
    if (!valid()) return false;
    if (ctx.state !== 'running')
      throw new Error('audio context blocked until a user gesture');
    master!.gain.setTargetAtTime(GENERATED_GAIN, ctx.currentTime, 0.9);
    if (!chordTimer) {
      chordTimer = setInterval(() => {
        chord += 1;
        setChord(chord, 1.4);
      }, CHORD_SECONDS * 1000);
    }
    startLimit();
    return true;
  };

  let fx: AudioContext | null = null;
  let lastCue = 0;
  return {
    cue(kind) {
      if (!enabled || performance.now() - lastCue < 70) return;
      lastCue = performance.now();
      try {
        fx ??= new AudioContext();
        void fx.resume().catch(() => {});
        const osc = fx.createOscillator();
        const gain = fx.createGain();
        const now = fx.currentTime;
        const duration = kind === 'hover' ? 0.045 : 0.2;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(kind === 'hover' ? 1100 : 460, now);
        osc.frequency.exponentialRampToValueAtTime(
          kind === 'hover' ? 700 : 90,
          now + duration,
        );
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.025, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(gain);
        gain.connect(fx.destination);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
        osc.start(now);
        osc.stop(now + duration);
      } catch {
        /* Sound is optional. */
      }
    },
    async enable(target) {
      if (enabled && current && !current.paused) return 'track';
      enabled = true;
      const id = ++operation;
      const valid = () => enabled && operation === id;
      scene = target;
      const src = await resolveSrc(target);
      if (!valid()) return 'off';
      if (src) {
        try {
          return (await playTrack(src, valid)) ? 'track' : 'off';
        } catch {
          // Browser refused the element; fall through to the generated bed.
        }
      }
      if (!valid()) return 'off';
      try {
        return (await playGenerated(valid)) ? 'generated' : 'off';
      } catch {
        if (!valid()) return 'off';
        enabled = false;
        clearLimit();
        return 'off';
      }
    },

    disable() {
      operation++;
      enabled = false;
      clearLimit();
      silence();
    },

    setScene(target) {
      scene = target;
      if (!enabled) return;
      void (async () => {
        const src = await resolveSrc(target);
        // Nothing for this view, the switch went off mid-probe, the view moved
        // on again, or this track is already playing: leave things alone.
        if (!src || !enabled || scene !== target || src === currentSrc) return;
        try {
          const id = operation;
          if (
            await playTrack(
              src,
              () => enabled && operation === id && scene === target,
            )
          )
            stopGenerated();
        } catch {
          /* keep whatever is currently playing */
        }
      })();
    },

    dispose() {
      operation++;
      enabled = false;
      void fx?.close();
      clearLimit();
      fades.forEach(clearInterval);
      fades.clear();
      elements.forEach((el) => el.pause());
      elements.clear();
      if (chordTimer) clearInterval(chordTimer);
      void ctx?.close();
      ctx = null;
      master = null;
      voices = [];
      current = null;
      currentSrc = '';
    },
  };
}
