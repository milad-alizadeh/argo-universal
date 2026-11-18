import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import { ShimmerText } from '#features/feed';
import { VoiceOrb } from '../voice-orb/voice-orb';
import type { VoiceOrbProps } from '../voice-orb/voice-orb-props';
import type { VoiceLabel } from './voice-label';

export type VoiceStageViewProps = Pick<VoiceOrbProps, 'state' | 'levels'> & {
  label: VoiceLabel;
};

// The well the orb sits in, and the surface it is clipped to: Paper's "Voice stage" draws both sunk into the page.
function OrbWell(
  props: Pick<VoiceOrbProps, 'state' | 'levels'>,
): React.JSX.Element {
  return (
    <View className="size-34 rounded-full bg-muted p-1 shadow-inner">
      <View className="overflow-hidden rounded-full shadow-inner">
        <VoiceOrb {...props} />
      </View>
    </View>
  );
}

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
export function VoiceStageView({
  label,
  ...orb
}: VoiceStageViewProps): React.JSX.Element {
  return (
    <View
      testID="voice-stage"
      className="w-full shrink-0 items-center gap-3.5 pb-2 pt-9"
    >
      <OrbWell {...orb} />
      <StageLabel label={label} />
    </View>
  );
}
