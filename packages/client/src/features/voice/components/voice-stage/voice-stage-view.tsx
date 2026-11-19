import { Text } from '@repo/kit/primitives/content/text';
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
    <View className="items-center gap-0.5">
      <ShimmerText text={label.headline} className="text-heading" />
      <Text role="secondary" tone="muted">
        {label.detail}
      </Text>
    </View>
  );
}

/*
 * The Voice call on screen: the orb in its well, what the call is doing under it, and how long it has run. Trouble and
 * the allowance warning are words in that label, never a dialog. The page pins it above the Feed for the call's length.
 */
export const VoiceStageView = (
  props: VoiceStageViewProps,
): React.JSX.Element =>
  kindOf(props.visualiser) === 'band' ? (
    <BandStage toggle={props.visualiser} />
  ) : (
    <CallStage {...props} />
  );

function CallStage({
  label,
  ...drawing
}: VoiceStageViewProps): React.JSX.Element {
  return (
    <View
      testID="voice-stage"
      className="w-full shrink-0 items-center gap-3.5 pb-2 pt-9"
    >
      <VoiceVisualiser {...drawing} />
      <StageLabel label={label} />
      <VoiceVisualiserToggle toggle={drawing.visualiser} />
    </View>
  );
}
