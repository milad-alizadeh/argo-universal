import type { VoiceOrbState } from '@repo/contracts';
import { bezierEasing } from '@repo/kit/bezier-easing';
import { easingCurve, motionDuration } from '@repo/kit/motion';
import { useReducedMotionNow } from '@repo/kit/use-reduced-motion-now';
import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type Part = 'open' | 'orb' | 'label';

// How far each part of the stage has come in: 0 is gone, 1 is in place. The orb's spring may pass 1 on the way.
export type StageReveal = Record<Part, SharedValue<number>> & {
  // Reduced motion: the parts only fade, and the room above the Feed opens and closes in one step.
  still: boolean;
};

type Done = (finished?: boolean) => void;

// Each part's animation to its end, and the one that ends the whole choreography calls `done`.
type Choreography = Record<Part, (done?: Done) => number>;

// The stage runs its motion whatever the system asks; reduced motion is answered with fades instead of movement.
const always = ReduceMotion.Never;

const decelerate = bezierEasing(easingCurve.decelerate);

const standard = bezierEasing(easingCurve.standard);

const timed = (
  to: number,
  duration: number,
  easing = decelerate,
): ((done?: Done) => number) => {
  return (done) =>
    withTiming(to, { duration, easing, reduceMotion: always }, done);
};

const later = (
  delay: number,
  animation: (done?: Done) => number,
): ((done?: Done) => number) => {
  return (done) => withDelay(delay, animation(done), always);
};

// Lengths and delays of the stage's moves, in milliseconds.
const move = {
  open: 420,
  orbDelay: 60,
  labelDelay: 170,
  label: 320,
  labelOut: 140,
  orbOutDelay: 40,
  orbOut: 220,
  closeDelay: 120,
  close: 320,
};

// The orb springs in with a little give past its size, as the room opens round it.
const orbSpring = {
  damping: 14,
  stiffness: 170,
  mass: 1,
  reduceMotion: always,
};

/*
 * In: the room opens over 420ms on the panes' decelerate curve; the orb springs in 60ms after it starts, and the label
 * follows 170ms after, over 320ms. Out reverses it a little faster: the label goes first, then the orb, then the room
 * closes over 320ms. Reduced motion fades the orb and label over the enter and exit lengths and opens the room at once.
 */
const choreographies: Record<
  'moving' | 'still',
  Record<'in' | 'out', Choreography>
> = {
  moving: {
    in: {
      open: timed(1, move.open),
      orb: later(move.orbDelay, () => withSpring(1, orbSpring)),
      label: later(move.labelDelay, timed(1, move.label)),
    },
    out: {
      label: timed(0, move.labelOut, standard),
      orb: later(move.orbOutDelay, timed(0, move.orbOut, standard)),
      open: later(move.closeDelay, timed(0, move.close, standard)),
    },
  },
  still: {
    in: {
      open: timed(1, 0),
      orb: timed(1, motionDuration.enter),
      label: timed(1, motionDuration.enter),
    },
    out: {
      label: timed(0, motionDuration.exit),
      orb: timed(0, motionDuration.exit),
      open: later(motionDuration.exit, timed(0, 0)),
    },
  },
};

function play(reveal: StageReveal, leaving: boolean, onLeft: () => void): void {
  const steps =
    choreographies[reveal.still ? 'still' : 'moving'][leaving ? 'out' : 'in'];

  const left: Done = (finished) => {
    'worklet';

    if (finished && leaving) runOnJS(onLeft)();
  };

  reveal.label.set(steps.label());
  reveal.orb.set(steps.orb());
  reveal.open.set(steps.open(left));
}

/*
 * The stage's entrance and exit, run on the UI thread: it comes in as it mounts, and goes out in reverse while it is
 * `leaving`, calling `onLeft` once the room above the Feed has closed. Coming back while it leaves turns it round.
 */
export function useStageReveal(
  leaving: boolean,
  onLeft: () => void,
): StageReveal {
  const still = useReducedMotionNow();
  const open = useSharedValue(0);
  const orb = useSharedValue(0);
  const label = useSharedValue(0);

  useEffect(() => {
    play({ open, orb, label, still }, leaving, onLeft);
  }, [leaving, still, open, orb, label, onLeft]);

  return { open, orb, label, still };
}

// One breath in or out while the call connects.
const breathMilliseconds = 1100;

const breathe = (): number =>
  withRepeat(
    withTiming(1, {
      duration: breathMilliseconds,
      easing: Easing.inOut(Easing.sin),
      reduceMotion: always,
    }),
    -1,
    true,
    undefined,
    always,
  );

// Once the call connects, the orb settles from wherever its breath was, with a little give.
const settleSpring = {
  damping: 9,
  stiffness: 180,
  mass: 1,
  reduceMotion: always,
};

/*
 * The orb breathes while there is no sound to show, which is while the call connects or reconnects, and settles into
 * place when the sound comes. Reduced motion holds it still: the label's words say it is connecting.
 */
export function useOrbBreath(state: VoiceOrbState): SharedValue<number> {
  const still = useReducedMotionNow();
  const breath = useSharedValue(0);
  const breathing = state === 'none' && !still;

  useEffect(() => {
    breath.set(breathing ? breathe() : withSpring(0, settleSpring));

    return (): void => cancelAnimation(breath);
  }, [breathing, breath]);

  return breath;
}
