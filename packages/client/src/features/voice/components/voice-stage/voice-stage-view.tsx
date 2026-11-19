import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ShimmerText } from '#features/feed';
import { VoiceVisualiser } from '../voice-visualiser/voice-visualiser';
import type { VoiceVisualiserProps } from '../voice-visualiser/voice-visualiser-props';
import {
  kindOf,
  type VoiceVisualiserToggleProps,
} from '../voice-visualiser/voice-visualiser-toggle';
import type { VoiceLabel } from './voice-label';
import { useOrbBreath } from './voice-stage-motion';
import {
  type Shown,
  type StageShown,
  useLabelStyle,
  useOrbStyle,
  useRevealOrInPlace,
} from './voice-stage-styles';
import { BandStage, RevealedToggle } from './voice-stage-toggle';

export type VoiceStageViewProps = VoiceVisualiserProps & {
  label: VoiceLabel;
  // The visualiser this Device chose and the toggle that switches it; the orb, with no toggle, where it is absent.
  visualiser?: VoiceVisualiserToggleProps;
  // How far the drawing and its label have come in; without it they are drawn in place.
  reveal?: StageShown;
};

type DrawingProps = VoiceVisualiserProps & {
  visualiser?: VoiceVisualiserToggleProps;
};

// The chosen drawing in its well, springing in and breathing while it has no sound to show.
function RevealedDrawing({
  shown,
  still,
  ...drawing
}: DrawingProps & Shown): React.JSX.Element {
  const breath = useOrbBreath(drawing.state);
  const style = useOrbStyle(shown, breath, still);

  return (
    <Animated.View style={style}>
      <VoiceVisualiser {...drawing} />
    </Animated.View>
  );
}

function StageLabel(props: Shown & { label: VoiceLabel }): React.JSX.Element {
  const { label } = props;
  const style = useLabelStyle(props.shown, props.still);

  return (
    <Animated.View className="items-center gap-1" style={style}>
      <ShimmerText text={label.headline} className="type-heading" />
      <Text role="secondary" tone="muted">
        {label.detail}
      </Text>
    </Animated.View>
  );
}

// With a toggle on top the stage starts 12 down; without one, the orb keeps Paper's 36.
const stageClass = (toggle: VoiceVisualiserToggleProps | undefined): string =>
  cn('w-full shrink-0 items-center gap-4 pb-6', toggle ? 'pt-3' : 'pt-9');

type StageProps = Omit<VoiceStageViewProps, 'reveal'> & { shown: StageShown };

function CallStage({
  label,
  shown,
  ...drawing
}: StageProps): React.JSX.Element {
  const { still } = shown;
  const toggle = { toggle: drawing.visualiser, shown: shown.label, still };

  return (
    <View testID="voice-stage" className={stageClass(drawing.visualiser)}>
      <RevealedToggle {...toggle} />
      <RevealedDrawing {...drawing} shown={shown.orb} still={still} />
      <StageLabel label={label} shown={shown.label} still={still} />
    </View>
  );
}

/*
 * The Voice call on screen: the toggle on top, where it stays whatever it picks, the chosen drawing in its well, what
 * the call is doing under it, and how long it has run. Trouble and the allowance warning are words in that label, never
 * a dialog. The page pins it above the Feed for the call's length, on the 4-point grid with room before the Feed. The
 * drawing breathes while it has no sound to show, and settles once the call connects; with Band chosen only the toggle
 * stays.
 */
export function VoiceStageView({
  reveal,
  ...props
}: VoiceStageViewProps): React.JSX.Element {
  const shown = useRevealOrInPlace(reveal);

  return kindOf(props.visualiser) === 'band' ? (
    <BandStage
      toggle={props.visualiser}
      shown={shown.label}
      still={shown.still}
    />
  ) : (
    <CallStage {...props} shown={shown} />
  );
}
