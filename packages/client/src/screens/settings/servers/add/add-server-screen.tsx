import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import type { KnownServer, ServerAddress } from '#features/connection';
import {
  type PairPhase,
  useAppServers,
  usePairServer,
} from '#features/servers';
import type { PairPageKind, PairWay } from './pair-copy';
import { PairPageView } from './pair-page-view';
import { ScanCamera } from './scan-camera';
import { ScanCodeView } from './scan-code-view';
import { TypeCodeView } from './type-code-view';

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
  // A phone starts on the camera; the code is typed only once the owner chose to (#1502).
  const [typing, setTyping] = useState(typesTheCode);

  useLink(props.link, pairing.read);

  return idle(pairing.state) ? (
    <Entry pairing={pairing} typing={typing} onTyping={setTyping} />
  ) : (
    <Outcome pairing={pairing} way={typing ? 'type' : 'scan'} />
  );
}

// Nothing has been tried yet, or a typed code is out being asked: the page that takes the code.
const idle = (
  state: PairPhase,
): state is Extract<PairPhase, { phase: 'scanning' | 'looking' }> =>
  state.phase === 'scanning' || state.phase === 'looking';

// A browser-shaped App has no camera: the desktop app takes the code typed, and a phone reads it (#1502).
const typesTheCode = Platform.OS === 'web';

interface EntryProps {
  pairing: Pairing;
  typing: boolean;
  onTyping: (typing: boolean) => void;
}

// A phone reads the code and offers to type it instead; a desktop only types.
function Entry(props: EntryProps): React.JSX.Element {
  return props.typing ? (
    <Typing {...props} />
  ) : (
    <Scanning
      onRead={props.pairing.read}
      onEnterCode={() => props.onTyping(true)}
    />
  );
}

function Typing({ pairing, onTyping }: EntryProps): React.JSX.Element {
  return (
    <TypeCodeView
      looking={pairing.state.phase === 'looking'}
      onSubmit={pairing.type}
      onScan={typesTheCode ? undefined : () => onTyping(false)}
    />
  );
}

// A paired Server is listed and shown at once, and the page leaves for its Sessions. The Settings stack is emptied first: `dismissTo('/')` left the page standing when it had been opened from a Server's own page (Pair again), so it showed "Waiting for approval" for good after the Server had let this Device in.
function useAddServer(): (server: KnownServer) => void {
  const router = useRouter();
  const { add } = useAppServers();

  return (server) => {
    add(server);
    router.dismissAll();
    router.navigate('/');
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

interface ScanningProps {
  onRead: (scanned: string) => void;
  onEnterCode: () => void;
}

function Scanning(props: ScanningProps): React.JSX.Element {
  const [permission, request] = useCameraPermissions();

  return (
    <ScanCodeView
      access={accessOf(permission)}
      camera={<ScanCamera onRead={props.onRead} />}
      onEnterCode={props.onEnterCode}
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
  state: Exclude<PairPhase, { phase: 'scanning' | 'looking' }>,
): PairPageKind => (state.phase === 'waiting' ? 'waiting' : state.outcome.kind);

// Cancelling the wait and scanning again are one thing, as is trying a Server that was not found once more; every other page leads back to the scanner.
interface OutcomeProps {
  pairing: Pairing;
  way: PairWay;
}

function Outcome({ pairing, way }: OutcomeProps): React.JSX.Element | null {
  const { state } = pairing;

  if (idle(state)) return null;

  return (
    <PairPageView
      kind={kindOf(state)}
      serverName={state.serverName}
      way={way}
      onAction={kindOf(state) === 'not-found' ? pairing.retry : pairing.back}
    />
  );
}
