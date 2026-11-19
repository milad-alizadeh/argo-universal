import type { VoiceStatus } from '@repo/contracts';
import { useEffect, useMemo, type JSX, type ReactNode } from 'react';
import {
  browserCarriesAudio,
  browserVoiceEnvironment,
} from './browser-voice-environment';
import { followCall } from './follow-call';
import { useVoiceStatus } from './use-voice-status';
import type { VoiceConnection } from './voice-connection';
import { VoiceConnectionProvider } from './voice-connection-context';
import { createWebRtcVoiceConnection } from './webrtc-voice-connection';

// The desktop App carries a Voice call's audio itself; any other page offers no voice button.
const connectionFor = (desktop: boolean): VoiceConnection | null =>
  desktop && browserCarriesAudio()
    ? createWebRtcVoiceConnection(browserVoiceEnvironment)
    : null;

interface HostProps {
  connection: VoiceConnection;
  // The Server's standing for the call, as `voice.watch` gives it.
  status: VoiceStatus;
  children: ReactNode;
}

/*
 * The App's voice connection, given to every screen and closed when the Server's call ends, whatever screen is shown.
 * Pages read it; none decides its lifetime.
 */
export function VoiceConnectionHost({
  connection,
  status,
  children,
}: HostProps): JSX.Element {
  const hear = useMemo(() => followCall(connection), [connection]);

  useEffect(() => hear(status), [hear, status]);

  return (
    <VoiceConnectionProvider value={connection}>
      {children}
    </VoiceConnectionProvider>
  );
}

// The host, following the Server's call from the root of the App.
function ServerVoiceHost(props: Omit<HostProps, 'status'>): JSX.Element {
  return <VoiceConnectionHost {...props} status={useVoiceStatus()} />;
}

type Props = { desktop: boolean; children: ReactNode };

export function DesktopVoiceProvider({
  desktop,
  children,
}: Props): JSX.Element {
  const connection = useMemo(() => connectionFor(desktop), [desktop]);

  return connection ? (
    <ServerVoiceHost connection={connection}>{children}</ServerVoiceHost>
  ) : (
    <VoiceConnectionProvider value={null}>{children}</VoiceConnectionProvider>
  );
}
