import { useMemo, type JSX, type ReactNode } from 'react';
import {
  browserCarriesAudio,
  browserVoiceEnvironment,
} from './browser-voice-environment';
import type { VoiceConnection } from './voice-connection';
import { VoiceConnectionProvider } from './voice-connection-context';
import { createWebRtcVoiceConnection } from './webrtc-voice-connection';

// The desktop App carries a Voice call's audio itself; any other page offers no voice button.
const connectionFor = (desktop: boolean): VoiceConnection | null =>
  desktop && browserCarriesAudio()
    ? createWebRtcVoiceConnection(browserVoiceEnvironment)
    : null;

type Props = { desktop: boolean; children: ReactNode };

export function DesktopVoiceProvider({
  desktop,
  children,
}: Props): JSX.Element {
  const connection = useMemo(() => connectionFor(desktop), [desktop]);

  return (
    <VoiceConnectionProvider value={connection}>
      {children}
    </VoiceConnectionProvider>
  );
}
