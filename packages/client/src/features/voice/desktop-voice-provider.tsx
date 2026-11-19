import { useEffect, useMemo, type JSX, type ReactNode } from 'react';
import {
  browserCarriesAudio,
  browserVoiceEnvironment,
} from './browser-voice-environment';
import { followCall } from './follow-call';
import { useVoiceStatus } from './use-voice-status';
import type { VoiceConnection } from './voice-connection';
import { VoiceConnectionProvider } from './voice-connection-context';
import { useVoiceDeviceChoice } from './voice-device-choice';
import { createWebRtcVoiceConnection } from './webrtc-voice-connection';

// The desktop App carries a Voice call's audio itself; any other page offers no voice button.
const connectionFor = (desktop: boolean): VoiceConnection | null =>
  desktop && browserCarriesAudio()
    ? createWebRtcVoiceConnection(browserVoiceEnvironment)
    : null;

// Follows the Server's call App-wide, so the microphone is released when it ends on any screen.
function FollowsCall({ connection }: { connection: VoiceConnection }): null {
  const status = useVoiceStatus();
  const hear = useMemo(() => followCall(connection), [connection]);

  useEffect(() => hear(status), [hear, status]);

  return null;
}

// Hands the connection this Device's chosen microphone and speaker, at start and whenever Settings changes them.
function FollowsDeviceChoice({
  connection,
}: {
  connection: VoiceConnection;
}): null {
  const { choice } = useVoiceDeviceChoice();

  useEffect(() => void connection.chooseDevices(choice), [connection, choice]);

  return null;
}

type Props = { desktop: boolean; children: ReactNode };

/*
 * The App's voice connection: made once where the App carries audio, and closed when the Server's call ends, whatever
 * screen is shown. Pages read it; none decides its lifetime.
 */
export function DesktopVoiceProvider({
  desktop,
  children,
}: Props): JSX.Element {
  const connection = useMemo(() => connectionFor(desktop), [desktop]);

  return (
    <VoiceConnectionProvider value={connection}>
      {connection && <FollowsCall connection={connection} />}
      {connection && <FollowsDeviceChoice connection={connection} />}
      {children}
    </VoiceConnectionProvider>
  );
}
