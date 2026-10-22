import {
  Canvas,
  FilterMode,
  Image,
  MipmapMode,
  type SkImage,
} from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo } from 'react';
import { PixelRatio } from 'react-native';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import { useNativeTheme } from '../../../native-theme';
import { useReducedMotionNow } from '../../../use-reduced-motion-now';
import { type Resolved, resolvePreset } from './engine/presets';
import { MODE_DRAWS } from './engine/registry';
import type { ModeDraw } from './engine/types';
import type { OrbFrame } from './orb-frame';
import { useOrbFrames } from './orb-frames';
import {
  disposePen,
  drawImage,
  type OrbInk,
  type OrbPen,
  penFor,
} from './orb-image';
import { defaultRMin } from './orb-ink';
import type { OrbProps, OrbSize, OrbState } from './orb-props';
import { orbPixels } from './orb-size';

const millisecondsPerSecond = 1000;

// The frame a reduced-motion viewer sees: a still with the shape readable.
const stillSeconds = 0.6;

// Drawn at up to twice its size, as the original draws on a 2× canvas.
const density = Math.min(PixelRatio.get(), 2);

// Scaled up smoothly, as a browser scales the original's canvas.
const sampling = { filter: FilterMode.Linear, mipmap: MipmapMode.None };

interface Drawing extends Resolved {
  draw: ModeDraw;
  pixels: number;
  ink: OrbInk;
  // The time to hold the drawing at, for a reduced-motion viewer; null lets it move.
  still: number | null;
}

type Look = Pick<Drawing, 'still'> & { state: OrbState; size: OrbSize };

interface OrbCanvasProps {
  image: SharedValue<SkImage | null>;
  pixels: number;
}

function useInk(preset: Resolved): OrbInk {
  const dark = useNativeTheme().colorScheme === 'dark';

  return useMemo(
    () => ({ dark, rMin: preset.opts.rMin ?? defaultRMin }),
    [dark, preset],
  );
}

function useDrawing({ state, size, still }: Look): Drawing {
  const preset = useMemo(() => resolvePreset(state, size), [state, size]);
  const ink = useInk(preset);

  return useMemo(
    () => ({
      ...preset,
      draw: MODE_DRAWS[preset.mode],
      pixels: orbPixels[size],
      ink,
      still,
    }),
    [ink, preset, size, still],
  );
}

// The pen lives on the UI thread, so it is freed there when the orb unmounts.
function usePen(): SharedValue<OrbPen | null> {
  const pen = useSharedValue<OrbPen | null>(null);

  useEffect(() => (): void => scheduleOnUI(disposePen, pen), [pen]);

  return pen;
}

function useOrbFrame(drawing: Drawing): OrbFrame {
  const pen = usePen();

  return useCallback(
    (milliseconds: number, previous: SkImage | null) => {
      'worklet';

      const { draw, pixels, speed, opts, ink, still } = drawing;
      const current = penFor(pen, pixels, density);
      const seconds = (milliseconds / millisecondsPerSecond) * speed;

      draw(current.dots, pixels, still ?? seconds, opts);

      return drawImage(current, ink, previous);
    },
    [drawing, pen],
  );
}

// The orb's image, kept still while paused or for a reduced-motion viewer.
function useOrbImage(
  state: OrbState,
  size: OrbSize,
  paused: boolean,
): SharedValue<SkImage | null> {
  const reducedMotion = useReducedMotionNow();
  const still = reducedMotion ? stillSeconds : null;
  const drawing = useDrawing({ state, size, still });

  return useOrbFrames(useOrbFrame(drawing), !(paused || reducedMotion));
}

function OrbRenderer(props: OrbProps): React.JSX.Element {
  const { state = 'working', size = 'md' } = props;

  return (
    <OrbCanvas
      image={useOrbImage(state, size, Boolean(props.paused))}
      pixels={orbPixels[size]}
    />
  );
}

function OrbCanvas({ image, pixels }: OrbCanvasProps): React.JSX.Element {
  return (
    <Canvas style={{ width: pixels, height: pixels }}>
      <Image
        image={image}
        width={pixels}
        height={pixels}
        fit="fill"
        sampling={sampling}
      />
    </Canvas>
  );
}

export default OrbRenderer;
