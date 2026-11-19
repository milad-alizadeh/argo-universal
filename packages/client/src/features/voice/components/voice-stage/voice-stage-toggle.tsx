import type * as React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  VoiceVisualiserToggle,
  type VoiceVisualiserToggleProps,
} from '../voice-visualiser/voice-visualiser-toggle';
import { type Shown, useLabelStyle } from './voice-stage-styles';

type ToggleProps = Shown & { toggle: VoiceVisualiserToggleProps | undefined };

// The visualiser toggle, coming in with the label as the stage opens.
export function RevealedToggle({
  toggle,
  shown,
  still,
}: ToggleProps): React.JSX.Element | null {
  const style = useLabelStyle(shown, still);

  return toggle ? (
    <Animated.View style={style}>
      <VoiceVisualiserToggle toggle={toggle} />
    </Animated.View>
  ) : null;
}

/*
 * The stage while the band along the Composer draws the call: only the toggle, where the full stage puts it, evenly
 * padded, so the Feed keeps nearly all its height and the person can still switch back.
 */
export function BandStage(props: ToggleProps): React.JSX.Element {
  return (
    <View testID="voice-stage" className="w-full shrink-0 items-center py-3">
      <RevealedToggle {...props} />
    </View>
  );
}
