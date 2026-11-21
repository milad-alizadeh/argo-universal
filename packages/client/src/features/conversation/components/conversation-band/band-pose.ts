/*
 * The band's pose: how present each look is, eased towards the state's own over a few tenths of a second, so a state
 * change reshapes the same bars. Worklets over plain numbers.
 */
import {
  blendOf,
  easeToward,
  poseTargetOf,
  poseTau,
  toneTau,
  type BandState,
  type Pose,
  type Tick,
} from './band-motion';

// Reduced motion slows every move to half the pace.
const calmer = 2;

interface Easing {
  pose: Pose;
  target: Pose;
  tick: Tick;
}

// The turn's colour sweep is a little slower than the rest, so it reads as a sweep.
const tauOf = (key: keyof Pose, tick: Tick): number => {
  'worklet';

  return (key === 'tone' ? toneTau : poseTau) * (tick.reduced ? calmer : 1);
};

const eased = (easing: Easing, key: keyof Pose): number => {
  'worklet';

  const blend = blendOf(easing.tick.dt, tauOf(key, easing.tick));

  return easeToward(easing.pose[key], easing.target[key], blend);
};

// The pose one frame later, on its way to the state's own.
export function easePose(pose: Pose, state: BandState, tick: Tick): Pose {
  'worklet';

  const easing = { pose, target: poseTargetOf(state), tick };

  return {
    user: eased(easing, 'user'),
    agent: eased(easing, 'agent'),
    think: eased(easing, 'think'),
    connect: eased(easing, 'connect'),
    mute: eased(easing, 'mute'),
    warn: eased(easing, 'warn'),
    tone: eased(easing, 'tone'),
  };
}
