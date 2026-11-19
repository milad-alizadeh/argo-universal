import type * as React from 'react';
import { View } from 'react-native';
import { VoiceOrb } from '../voice-orb/voice-orb';
import type { VoiceVisualiserProps } from './voice-visualiser-props';

/*
 * The well the orb sits in, sunk into the page as Paper's "Voice stage" draws it. The band, the other visualiser,
 * draws along the Composer instead, so the stage never holds it.
 */
export function VoiceVisualiser(
  props: VoiceVisualiserProps,
): React.JSX.Element {
  return (
    <View
      testID="voice-visualiser"
      className="size-34 rounded-full bg-muted p-1 shadow-inner"
    >
      <View className="overflow-hidden rounded-full shadow-inner">
        <VoiceOrb {...props} />
      </View>
    </View>
  );
}
