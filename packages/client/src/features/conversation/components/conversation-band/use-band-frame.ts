import { useReducedMotionNow } from '@repo/kit/use-reduced-motion-now';
import { useEffect, useMemo } from 'react';
import {
  type FrameInfo,
  type SharedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';
import type { VoiceSpectrum } from '../../types/conversation-connection';
import { rgbOf, type Rgb } from './band-colour';
import {
  newSim,
  stepBand,
  type BandFrame,
  type BandSim,
  type Palette,
} from './band-frame';
import type { BandState } from './band-motion';

interface BandSettings {
  state: BandState;
  count: number;
  palette: Palette;
  reduced: boolean;
}

interface Voices {
  user: number[];
  agent: number[];
}

const noVoices: Voices = { user: [], agent: [] };

const emptyFrame: BandFrame = { heights: [], fills: [] };

/*
 * The theme's colours the band draws with. The Agent's blue is the `info` token and the rest are tokens too; there is
 * no token yet for the person's voice, so it takes the palette's orange.
 */
const tokens = [
  '--color-orange-500',
  '--color-info',
  '--color-tertiary',
  '--color-warning',
  '--color-danger',
];

const grey = 128;

const fallback: Rgb = [grey, grey, grey];

const colourOf = (value: string | number | undefined): Rgb =>
  (typeof value === 'string' ? rgbOf(value) : undefined) ?? fallback;

function usePalette(): Palette {
  const [user, agent, quiet, warn, danger] = useCSSVariable(tokens);

  return useMemo(
    () => ({
      user: colourOf(user),
      agent: colourOf(agent),
      quiet: colourOf(quiet),
      warn: colourOf(warn),
      danger: colourOf(danger),
    }),
    [user, agent, quiet, warn, danger],
  );
}

/*
 * The call's sound comes from the JS thread (the analyser lives there on the web); this copies it into a shared value
 * each frame, so the UI thread reads it without React rendering. Without a source the bands stay silent: a phone
 * carries no call audio yet.
 */
function useConversations(spectrum?: () => VoiceSpectrum): SharedValue<Voices> {
  const voices = useSharedValue(noVoices);

  useEffect(() => {
    if (!spectrum) return;

    let frame = 0;

    const read = (): void => {
      const bands = spectrum();

      voices.set({ user: [...bands.input], agent: [...bands.output] });
      frame = requestAnimationFrame(read);
    };

    frame = requestAnimationFrame(read);

    return (): void => cancelAnimationFrame(frame);
  }, [spectrum, voices]);

  return voices;
}

const millisecondsPerSecond = 1000;

// A frame that took longer than this was a pause, not a step to simulate.
const longestFrame = 0.1;

interface Running {
  settings: SharedValue<BandSettings>;
  voices: SharedValue<Voices>;
  sim: SharedValue<BandSim>;
  frame: SharedValue<BandFrame>;
}

// One frame on the UI thread: steps the sim from the latest settings and voices, and publishes the bars.
function nextStep(run: Running, info: FrameInfo): void {
  'worklet';

  const { reduced, ...scene } = run.settings.get();
  const dt = (info.timeSincePreviousFrame ?? 0) / millisecondsPerSecond;
  const tick = { dt: Math.min(longestFrame, dt), reduced };
  const step = stepBand(run.sim.get(), { ...scene, ...run.voices.get(), tick });

  run.sim.set(step.sim);
  run.frame.set(step.frame);
}

const useFrameStep = (run: Running): void => {
  useFrameCallback((info: FrameInfo) => {
    'worklet';

    nextStep(run, info);
  });
};

const useSceneSettings = (state: BandState, count: number): BandSettings => {
  const palette = usePalette();
  const reduced = useReducedMotionNow();

  return useMemo(
    () => ({ state, count, palette, reduced }),
    [state, count, palette, reduced],
  );
};

// The settings the frame step reads, kept in a shared value so the UI thread sees each change without a render.
function useSettings(
  state: BandState,
  count: number,
): SharedValue<BandSettings> {
  const settings = useSceneSettings(state, count);
  const shared = useSharedValue(settings);

  useEffect(() => {
    shared.set(settings);
  }, [shared, settings]);

  return shared;
}

/*
 * Runs the band on the UI thread: each frame steps the sim from the latest settings and voices and writes the bars'
 * heights and fills to a shared value that every bar's animated style reads. React only renders when the call's state,
 * the width or the theme changes.
 */
export function useBandFrame(
  state: BandState,
  count: number,
  spectrum?: () => VoiceSpectrum,
): SharedValue<BandFrame> {
  const settings = useSettings(state, count);
  const voices = useConversations(spectrum);
  const frame = useSharedValue(emptyFrame);
  const sim = useSharedValue(newSim());

  useFrameStep({ settings, voices, sim, frame });

  return frame;
}
