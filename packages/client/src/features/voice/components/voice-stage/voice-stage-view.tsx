import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ShimmerText } from '#features/feed';
import { VoiceVisualiser } from '../voice-visualiser/voice-visualiser';
import type { VoiceVisualiserProps } from '../voice-visualiser/voice-visualiser-props';
import type { VoiceLabel } from './voice-label';
import { useOrbBreath } from './voice-stage-motion';
import {
  type Shown,
  type StageShown,
  useLabelStyle,
  useOrbStyle,
  useRevealOrInPlace,
} from './voice-stage-styles';

export type VoiceStageViewProps = VoiceVisualiserProps & {
  label: VoiceLabel;
  // How far the drawing and its label have come in; without it they are drawn in place.
  reveal?: StageShown;
};

// The orb in its well, springing in and breathing while it has no sound to show.
function RevealedDrawing({
  shown,
  still,
  ...drawing
}: VoiceVisualiserProps & Shown): React.JSX.Element {
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

type StageProps = Omit<VoiceStageViewProps, 'reveal'> & { shown: StageShown };

/*
 * The Voice call on screen: the orb in its well, what the call is doing under it, and how long it has run. Trouble and
 * the allowance warning are words in that label, never a dialog. The page pins it above the Feed for the call's
 * length, on the 4-point grid with room before the Feed. The orb breathes while it has no sound to show, and settles
 * once the call connects. With the band chosen in Settings › Voice the page draws no stage at all.
 */
function CallStage({
  label,
  shown,
  ...drawing
}: StageProps): React.JSX.Element {
  const { still } = shown;

  return (
    <View testID="voice-stage" className={stageClass}>
      <RevealedDrawing {...drawing} shown={shown.orb} still={still} />
      <StageLabel label={label} shown={shown.label} still={still} />
    </View>
  );
}

// Paper's 36 above the orb, and 24 of room before the Feed.
const stageClass = 'w-full shrink-0 items-center gap-4 pt-9 pb-6';

export function VoiceStageView({
  reveal,
  ...props
}: VoiceStageViewProps): React.JSX.Element {
  return <CallStage {...props} shown={useRevealOrInPlace(reveal)} />;
}
