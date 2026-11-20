import type { VoiceStatus } from '@repo/contracts';
import { useEffect, useMemo, type JSX, type ReactNode } from 'react';
import { useReportedVoiceDevices } from '../hooks/use-reported-conversation-devices';
import { useVoiceStatus } from '../hooks/use-conversation-status';
import type { VoiceConnection } from '../types/conversation-connection';
import { followCall } from '../utils/follow-conversation';
import {
  browserCarriesAudio,
  browserVoiceEnvironment,
} from './browser-conversation-environment';
import { VoiceConnectionProvider } from './conversation-connection-context';
import { useVoiceDeviceChoice } from './conversation-device-choice';
import { createWebRtcVoiceConnection } from './webrtc-conversation-connection';

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

// Hands the connection this Device's chosen microphone and speaker, at start and whenever Settings or the Server changes them.
function FollowsDeviceChoice({
  connection,
}: {
  connection: VoiceConnection;
}): null {
  const { choice } = useVoiceDeviceChoice();

  useReportedVoiceDevices();
  useEffect(() => void connection.chooseDevices(choice), [connection, choice]);

  return null;
}

type Props = { desktop: boolean; children: ReactNode };

export function DesktopVoiceProvider({
  desktop,
  children,
}: Props): JSX.Element {
  const connection = useMemo(() => connectionFor(desktop), [desktop]);

  return connection ? (
    <ServerVoiceHost connection={connection}>
      <FollowsDeviceChoice connection={connection} />
      {children}
    </ServerVoiceHost>
  ) : (
    <VoiceConnectionProvider value={null}>{children}</VoiceConnectionProvider>
  );
}
