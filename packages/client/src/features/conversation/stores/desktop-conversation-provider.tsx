import type { ConversationStatus } from '@repo/contracts';
import { useEffect, useMemo, type JSX, type ReactNode } from 'react';
import { useShowsServer } from '#features/servers';
import { LatencyPanel } from '../components/latency-panel/latency-panel';
import { useConversationStatus } from '../hooks/use-conversation-status';
import { useReportedConversationDevices } from '../hooks/use-reported-conversation-devices';
import type { ConversationConnection } from '../types/conversation-connection';
import { followConversation } from '../utils/follow-conversation';
import {
  browserCarriesAudio,
  browserConversationEnvironment,
} from './browser-conversation-environment';
import { ConversationConnectionProvider } from './conversation-connection-context';
import { useConversationDeviceChoice } from './conversation-device-choice';
import { phoneConversationEnvironment } from './phone-conversation-environment';
import { createWebRtcConversationConnection } from './webrtc-conversation-connection';

// Desktop and supported native Apps carry Conversation audio through their respective environments.
function connectionFor(desktop: boolean): ConversationConnection | null {
  if (desktop && browserCarriesAudio())
    return createWebRtcConversationConnection(browserConversationEnvironment);

  return phoneConversationEnvironment
    ? createWebRtcConversationConnection(phoneConversationEnvironment)
    : null;
}

interface HostProps {
  connection: ConversationConnection;
  // The Server's standing for the call, as `conversation.watch` gives it.
  status: ConversationStatus;
  children: ReactNode;
}

/*
 * The App's voice connection, given to every screen and closed when the Server's call ends, whatever screen is shown.
 * Pages read it; none decides its lifetime.
 */
export function ConversationConnectionHost({
  connection,
  status,
  children,
}: HostProps): JSX.Element {
  const hear = useMemo(() => followConversation(connection), [connection]);

  useEffect(() => hear(status), [hear, status]);

  return (
    <ConversationConnectionProvider value={connection}>
      {children}
    </ConversationConnectionProvider>
  );
}

// The host, following the Server's call from the root of the App.
function ServerConversationHost(props: Omit<HostProps, 'status'>): JSX.Element {
  return (
    <ConversationConnectionHost {...props} status={useConversationStatus()} />
  );
}

// Hands the connection this Device's chosen microphone and speaker, at start and whenever Settings or the Server changes them.
function FollowsDeviceChoice({
  connection,
}: {
  connection: ConversationConnection;
}): null {
  const { choice } = useConversationDeviceChoice();

  useReportedConversationDevices();
  useEffect(() => void connection.chooseDevices(choice), [connection, choice]);

  return null;
}

type Props = { desktop: boolean; children: ReactNode };

// SPIKE (latency on a phone): a phone chooses no device, and both draw the latency panel over the App.
function Hosted(props: {
  connection: ConversationConnection;
  desktop: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <ServerConversationHost connection={props.connection}>
      {props.desktop ? (
        <FollowsDeviceChoice connection={props.connection} />
      ) : null}
      {props.children}
      {__DEV__ ? <LatencyPanel /> : null}
    </ServerConversationHost>
  );
}

export function DesktopConversationProvider({
  desktop,
  children,
}: Props): JSX.Element {
  const connection = useMemo(() => connectionFor(desktop), [desktop]);
  // The Server's call is read over a Server's Connection; a Device holding none, as a clean install is, has no call to follow.
  const showsServer = useShowsServer();

  return connection && showsServer ? (
    <Hosted connection={connection} desktop={desktop}>
      {children}
    </Hosted>
  ) : (
    <ConversationConnectionProvider value={null}>
      {children}
    </ConversationConnectionProvider>
  );
}
