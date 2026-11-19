import type * as React from 'react';
import { View } from 'react-native';
import { useOrbColors } from './orb-colors';
import { orbDisc, orbName, type VoiceOrbProps } from './voice-orb-props';

/*
 * The orb where the App has no WebGL to draw ElevenLabs' orb with, which is every phone for now: a still disc in the
 * lighter of the orb's two colours. The web and desktop drawing is `voice-orb.web.tsx`; a phone's own drawing replaces
 * this file.
 */
export function VoiceOrb(props: VoiceOrbProps): React.JSX.Element {
  const [lighter] = useOrbColors(props.colors);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={orbName(props.state)}
      className="rounded-full"
      style={orbDisc(lighter)}
    />
  );
}
