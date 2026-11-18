import type { SkImage } from '@shopify/react-native-skia';
import { useCallback, useContext, useEffect, useId, useMemo } from 'react';
import { PixelRatio } from 'react-native';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import { useNativeTheme } from '../../../native-theme';
import { useReducedMotionNow } from '../../../use-reduced-motion-now';
import { OrbCanvas } from './orb-canvas';
import { drawOrb, type OrbDrawing } from './orb-draw';
import type { OrbDriverProps } from './orb-driver-props';
import type { OrbFrame } from './orb-frame';
import { useOrbFrames } from './orb-frames';
import type { OrbHolder } from './orb-holders';
import { disposePen, drawImage, type OrbPen, penFor } from './orb-image';
import { orbMotions } from './orb-motions';
import type { OrbProps, OrbSize, OrbState } from './orb-props';
import { OrbSeatHost, SeatedOrb } from './orb-seat';
import { type OrbAsks, type OrbShare, OrbShareContext } from './orb-share';
import { orbPixels } from './orb-size';

// The frame a reduced-motion viewer sees: a still with the shape readable.
const stillSeconds = 0.6;

// Drawn at up to twice its size, as the original draws on a 2× canvas.
const density = Math.min(PixelRatio.get(), 2);

// What an orb shows and how it comes to show it.
interface Look {
  state: OrbState;
  size: OrbSize;
  paused: boolean;
  // Whether it fades in on its first frame, rather than starting whole.
  fadesIn: boolean;
}

// The orb's drawing, held still while paused or for a reduced-motion viewer.
function useDrawing({ state, size, paused, fadesIn }: Look): OrbDrawing {
  const dark = useNativeTheme().colorScheme === 'dark';
  const reducedMotion = useReducedMotionNow();
  const still = reducedMotion ? stillSeconds : null;
  const moving = !(paused || reducedMotion);

  return useMemo(
    () => ({ motions: orbMotions[size], state, dark, still, moving, fadesIn }),
    [dark, fadesIn, moving, size, state, still],
  );
}

// The pen lives on the UI thread, so it is freed there when the orb unmounts.
function usePen(): SharedValue<OrbPen | null> {
  const pen = useSharedValue<OrbPen | null>(null);

  useEffect(() => (): void => scheduleOnUI(disposePen, pen), [pen]);

  return pen;
}

function useOrbFrame(drawing: OrbDrawing, pixels: number): OrbFrame {
  const pen = usePen();

  return useCallback(
    (milliseconds: number, previous: SkImage | null) => {
      'worklet';

      const current = penFor(pen, pixels, density);

      drawOrb(current, drawing, milliseconds);

      return drawImage(current, previous);
    },
    [drawing, pen, pixels],
  );
}

// The orb's image, drawn into `slot` when something outside the orb shows it.
function useOrbImage(
  look: Look,
  slot?: SharedValue<SkImage | null>,
): SharedValue<SkImage | null> {
  const drawing = useDrawing(look);
  const frame = useOrbFrame(drawing, orbPixels[look.size]);

  return useOrbFrames(frame, drawing.moving, slot);
}

function OwnOrb(props: OrbProps): React.JSX.Element {
  const { state = 'working', size = 'md' } = props;
  const paused = Boolean(props.paused);

  return (
    <OrbCanvas
      image={useOrbImage({ state, size, paused, fadesIn: false })}
      pixels={orbPixels[size]}
    />
  );
}

// Asks the shared orb for this orb's look while it is on screen.
function useHeldLook({ join, leave }: OrbAsks, look: Asked): string {
  const id = useId();
  const { state, size } = look;

  useEffect(() => join({ id, state, size }), [id, join, size, state]);
  useEffect(() => (): void => leave(id), [id, leave]);

  return id;
}

type Asked = Pick<OrbHolder, 'state' | 'size'>;

const askedOf = ({ state = 'working', size = 'md' }: OrbProps): Asked => ({
  state,
  size,
});

// The shared drawing, in this orb's place: it was running before this orb mounted, so it has no first frame to wait for.
function SharedOrbCanvas({
  share,
  size,
}: {
  share: OrbShare;
  size: OrbSize;
}): React.JSX.Element {
  const pixels = orbPixels[size];

  return (
    <OrbSeatHost seat={share.seat} pixels={pixels}>
      <OrbCanvas image={share.image} pixels={pixels} />
    </OrbSeatHost>
  );
}

// Shows the orb its `OrbContinuity` draws. While a newer orb shows it instead, this one draws an orb of its own, so two on screen at once both draw.
function ContinuedOrb({
  share,
  ...orb
}: OrbProps & { share: OrbShare }): React.JSX.Element {
  const asked = askedOf(orb);
  const id = useHeldLook(share, asked);

  return share.displaced.includes(id) ? (
    <OwnOrb {...orb} />
  ) : (
    <SharedOrbCanvas share={share} size={asked.size} />
  );
}

function OrbRenderer(props: OrbProps): React.JSX.Element {
  const share = useContext(OrbShareContext);

  return share && props.continues ? (
    <ContinuedOrb share={share} {...props} />
  ) : (
    <OwnOrb {...props} />
  );
}

// The loop an `OrbContinuity` draws its one orb with, and on the web the one canvas its orbs pass between them.
export function OrbDriver(props: OrbDriverProps): React.JSX.Element {
  const { image, state, size } = props;

  useOrbImage({ state, size, paused: false, fadesIn: true }, image);

  return (
    <SeatedOrb seat={props.seat}>
      <OrbCanvas image={image} pixels={orbPixels[size]} />
    </SeatedOrb>
  );
}

export default OrbRenderer;
