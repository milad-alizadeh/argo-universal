import { useAnimatedStyle } from '@repo/kit/animated-hooks';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { ShimmerText } from '#features/feed';
import { VoiceOrb } from '../voice-orb/voice-orb';
import type { VoiceOrbProps } from '../voice-orb/voice-orb-props';
import type { VoiceLabel } from './voice-label';
import { type StageReveal, useOrbBreath } from './voice-stage-motion';

export type VoiceStageViewProps = Pick<VoiceOrbProps, 'state' | 'levels'> & {
  label: VoiceLabel;
  // How far the orb and its label have come in; without it they are drawn in place.
  reveal?: Pick<StageReveal, 'orb' | 'label' | 'still'>;
};

// The orb grows from 60% of its size as it springs in, and swells by 4% at the top of each breath while it connects.
const orbEntryScale = 0.6;

const breathScale = 0.04;

// A connecting orb dims a little as it breathes out, so it reads as working rather than paused.
const breathDim = 0.18;

// The label rises 8 points into place behind the orb.
const labelRise = 8;

const clamp = Extrapolation.CLAMP;

function useOrbStyle(
  orb: SharedValue<number>,
  breath: SharedValue<number>,
  still: boolean,
): ReturnType<typeof useAnimatedStyle> {
  return useAnimatedStyle(() => {
    const shown = orb.get();
    const entry = still ? 1 : interpolate(shown, [0, 1], [orbEntryScale, 1]);

    return {
      opacity: Math.min(1, shown) * (1 - breathDim * breath.get()),
      transform: [{ scale: entry * (1 + breathScale * breath.get()) }],
    };
  }, [orb, breath, still]);
}

// The well the orb sits in, and the surface it is clipped to: Paper's "Voice stage" draws both sunk into the page.
type Shown = { shown: SharedValue<number>; still: boolean };

type OrbWellProps = Pick<VoiceOrbProps, 'state' | 'levels'> & Shown;

function OrbWell(props: OrbWellProps): React.JSX.Element {
  const breath = useOrbBreath(props.state);
  const style = useOrbStyle(props.shown, breath, props.still);

  return (
    <Animated.View
      className="size-34 rounded-full bg-muted p-1 shadow-inner"
      style={style}
    >
      <View className="overflow-hidden rounded-full shadow-inner">
        <VoiceOrb state={props.state} levels={props.levels} />
      </View>
    </Animated.View>
  );
}

function useLabelStyle(
  label: SharedValue<number>,
  still: boolean,
): ReturnType<typeof useAnimatedStyle> {
  return useAnimatedStyle(() => {
    const shown = label.get();
    const rise = interpolate(shown, [0, 1], [labelRise, 0], clamp);

    return { opacity: shown, transform: [{ translateY: still ? 0 : rise }] };
  }, [label, still]);
}

function StageLabel(props: Shown & { label: VoiceLabel }): React.JSX.Element {
  const { label } = props;
  const style = useLabelStyle(props.shown, props.still);

  return (
    <Animated.View className="items-center gap-0.5" style={style}>
      <ShimmerText text={label.headline} className="text-heading" />
      <Text role="secondary" tone="muted">
        {label.detail}
      </Text>
    </Animated.View>
  );
}

// Drawn in place, for a stage nothing brings in.
function useRevealOrInPlace(
  reveal: VoiceStageViewProps['reveal'],
): NonNullable<VoiceStageViewProps['reveal']> {
  const inPlace = useSharedValue(1);

  return reveal ?? { orb: inPlace, label: inPlace, still: false };
}

/*
 * The Voice call on screen: the orb in its well, what the call is doing under it, and how long it has run. Trouble and
 * the allowance warning are words in that label, never a dialog. The page pins it above the Feed for the call's length.
 * The orb breathes while it has no sound to show, and settles once the call connects.
 */
export function VoiceStageView(props: VoiceStageViewProps): React.JSX.Element {
  const { label, reveal, ...orb } = props;
  const shown = useRevealOrInPlace(reveal);

  return (
    <View
      testID="voice-stage"
      className="w-full shrink-0 items-center gap-3.5 pb-2 pt-9"
    >
      <OrbWell {...orb} shown={shown.orb} still={shown.still} />
      <StageLabel label={label} shown={shown.label} still={shown.still} />
    </View>
  );
}
