import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import type { KnownServer, ServerAddress } from '#features/connection';
import {
  type PairPhase,
  useAppServers,
  usePairServer,
} from '#features/servers';
import type { PairPageKind } from './pair-copy';
import { PairPageView } from './pair-page-view';
import { ScanCamera } from './scan-camera';
import { ScanCodeView } from './scan-code-view';

type Pairing = ReturnType<typeof usePairServer>;

/*
 * Add a Server (ADR-0045): read the code on the other computer's screen, wait while its owner allows this Device, and land on the new Server's Sessions. The Server lists and shows itself the moment it is paired, so there is no step between.
 */
export interface AddServerScreenProps {
  // A code that arrived in a link rather than through the camera, with where to knock when nothing announces the Server. Only a build made for proving pairing on a phone passes it.
  link?: { invite: string; address?: ServerAddress };
}

export function AddServerScreen(
  props: AddServerScreenProps,
): React.JSX.Element {
  const pairing = usePairServer(useAddServer());

  useLink(props.link, pairing.read);

  return pairing.state.phase === 'scanning' ? (
    <Scanning onRead={pairing.read} />
  ) : (
    <Outcome pairing={pairing} />
  );
}

// A paired Server is listed and shown at once, and the page leaves for its Sessions.
function useAddServer(): (server: KnownServer) => void {
  const router = useRouter();
  const { add } = useAppServers();

  return (server) => {
    add(server);
    router.dismissTo('/');
  };
}

// The link is read once, when the page opens: a code in it is spent by that one attempt.
function useLink(
  link: AddServerScreenProps['link'],
  read: Pairing['read'],
): void {
  const spent = useRef(false);

  useEffect(() => {
    if (!link || spent.current) return;

    spent.current = true;
    read(link.invite, link.address);
  }, [link, read]);
}

function Scanning({
  onRead,
}: {
  onRead: (scanned: string) => void;
}): React.JSX.Element {
  const [permission, request] = useCameraPermissions();

  return (
    <ScanCodeView
      access={accessOf(permission)}
      camera={<ScanCamera onRead={onRead} />}
      onContinue={() => void request()}
      onOpenSettings={() => void Linking.openSettings()}
    />
  );
}

type Permission = ReturnType<typeof useCameraPermissions>[0];

const isGranted = (permission: Permission): boolean =>
  permission?.granted === true;

const isRefused = (permission: Permission): boolean =>
  permission?.canAskAgain === false;

// A permission still being read is shown as not yet asked, which is what the owner reads until the system answers.
function accessOf(permission: Permission): 'ask' | 'refused' | 'allowed' {
  if (isGranted(permission)) return 'allowed';

  return isRefused(permission) ? 'refused' : 'ask';
}

const kindOf = (
  state: Exclude<PairPhase, { phase: 'scanning' }>,
): PairPageKind => (state.phase === 'waiting' ? 'waiting' : state.outcome.kind);

// Cancelling the wait and scanning again are one thing, as is trying a Server that was not found once more; every other page leads back to the scanner.
function Outcome({ pairing }: { pairing: Pairing }): React.JSX.Element | null {
  const { state } = pairing;

  if (state.phase === 'scanning') return null;

  const kind = kindOf(state);

  return (
    <PairPageView
      kind={kind}
      serverName={state.serverName}
      onAction={kind === 'not-found' ? pairing.retry : pairing.back}
    />
  );
}
