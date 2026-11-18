import { useMemo, type JSX, type ReactNode } from 'react';
import {
  browserCarriesAudio,
  browserVoiceEnvironment,
} from './browser-voice-environment';
import { VoiceConnectionContext } from './voice-connection-context';
import { createWebRtcVoiceConnection } from './webrtc-voice-connection';

// The desktop App carries a Voice call's audio itself; any other page offers no voice button.
export function DesktopVoiceProvider({
  desktop,
  children,
}: {
  desktop: boolean;
  children: ReactNode;
}): JSX.Element {
  const connection = useMemo(
    () =>
      desktop && browserCarriesAudio()
        ? createWebRtcVoiceConnection(browserVoiceEnvironment)
        : null,
    [desktop],
  );

  return (
    <VoiceConnectionContext.Provider value={connection}>
      {children}
    </VoiceConnectionContext.Provider>
  );
}
