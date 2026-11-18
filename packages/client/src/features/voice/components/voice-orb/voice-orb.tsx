import type * as React from 'react';
import { View } from 'react-native';
import { voiceOrbSize, type VoiceOrbProps } from './voice-orb-props';

/*
 * The orb where the App has no WebGL to draw ElevenLabs' orb with, which is every phone for now: a still disc in the
 * Info tone. The web and desktop drawing is `voice-orb.web.tsx`; a phone's own drawing replaces this file.
 */
export function VoiceOrb(props: VoiceOrbProps): React.JSX.Element {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Voice ${props.state}`}
      className="rounded-full bg-tone-info-200"
      style={{ width: voiceOrbSize, height: voiceOrbSize }}
    />
  );
}
