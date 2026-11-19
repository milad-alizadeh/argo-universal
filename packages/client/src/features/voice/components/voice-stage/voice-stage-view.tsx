import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import { ShimmerText } from '#features/feed';
import { VoiceVisualiser } from '../voice-visualiser/voice-visualiser';
import type { VoiceVisualiserProps } from '../voice-visualiser/voice-visualiser-props';
import {
  BandStage,
  kindOf,
  VoiceVisualiserToggle,
  type VoiceVisualiserToggleProps,
} from '../voice-visualiser/voice-visualiser-toggle';
import type { VoiceLabel } from './voice-label';

export type VoiceStageViewProps = VoiceVisualiserProps & {
  label: VoiceLabel;
  // The visualiser this Device chose and the toggle that switches it; the orb, with no toggle, where it is absent.
  visualiser?: VoiceVisualiserToggleProps;
};

function StageLabel({ label }: { label: VoiceLabel }): React.JSX.Element {
  return (
    <View className="items-center gap-1">
      <ShimmerText text={label.headline} className="type-heading" />
      <Text role="secondary" tone="muted">
        {label.detail}
      </Text>
    </View>
  );
}

/*
 * The Voice call on screen: the toggle on top, where it stays whatever it picks, the orb in its well, what the call is
 * doing under it, and how long it has run. Trouble and the allowance warning are words in that label, never a dialog.
 * The page pins it above the Feed for the call's length, on the 4-point grid with room before the Feed.
 */
export const VoiceStageView = (
  props: VoiceStageViewProps,
): React.JSX.Element =>
  kindOf(props.visualiser) === 'band' ? (
    <BandStage toggle={props.visualiser} />
  ) : (
    <CallStage {...props} />
  );

// With a toggle on top the stage starts 12 down; without one, the orb keeps Paper's 36.
const stageClass = (toggle: VoiceVisualiserToggleProps | undefined): string =>
  cn('w-full shrink-0 items-center gap-4 pb-6', toggle ? 'pt-3' : 'pt-9');

function CallStage({
  label,
  ...drawing
}: VoiceStageViewProps): React.JSX.Element {
  return (
    <View testID="voice-stage" className={stageClass(drawing.visualiser)}>
      <VoiceVisualiserToggle toggle={drawing.visualiser} />
      <VoiceVisualiser {...drawing} />
      <StageLabel label={label} />
    </View>
  );
}
