import { useRouter } from 'expo-router';
import type * as React from 'react';
import { Linking } from 'react-native';
import type { PairPhase, PairServer } from '#features/servers';
import { type LocalNetworkKind } from './local-network-copy';
import { LocalNetworkView } from './local-network-view';
import { NotFoundView } from './not-found-view';
import type { PairWay } from './pair-copy';
import { PairPageView } from './pair-page-view';

// What the page after a scan draws: the look and the wait over the scanner, or how the attempt ended.
export type Shown =
  | Exclude<PairPhase, { phase: 'scanning' | 'looking' }>
  | { phase: 'looking'; serverName: string };

type Ended = Extract<Shown, { phase: 'failed' }>;

// A typed code is asked of the Servers on the network before any can be named, and the entry page draws that look itself.
export const shown = (state: PairPhase): state is Shown =>
  state.phase !== 'scanning' &&
  !(state.phase === 'looking' && !state.serverName);

const localNetworkKinds: ReadonlySet<string> = new Set([
  'denied',
  'misconfigured',
  'undetermined',
]);

const isLocalNetwork = (
  kind: Page | LocalNetworkKind,
): kind is LocalNetworkKind => localNetworkKinds.has(kind);

// A build that cannot look is a fault only its developers can mend: the page that says so is for debug builds, and a release build says what it would for any Server it did not find, after logging.
const kindOf = (ended: Ended): Page | LocalNetworkKind =>
  ended.outcome.kind === 'misconfigured' && !__DEV__
    ? 'not-found'
    : ended.outcome.kind;

export interface PairOutcomeProps {
  pairing: PairServer;
  state: Shown;
  way: PairWay;
}

// Cancelling the look or the wait and scanning again are one thing, as is trying a Server that was not found once more; every other page leads back to the scanner.
export function PairOutcome(props: PairOutcomeProps): React.JSX.Element {
  const { pairing, state, way } = props;

  if (state.phase === 'failed') return <EndedPage {...props} state={state} />;

  return (
    <PairPageView
      kind={state.phase === 'waiting' ? 'waiting' : 'finding'}
      serverName={state.serverName}
      way={way}
      onAction={pairing.back}
    />
  );
}

type Page = Exclude<Ended['outcome']['kind'], LocalNetworkKind>;

// The scanned code's not-found page takes an address; a typed code's was typed with its own.
const takesAddress = (kind: Page, way: PairWay): boolean =>
  kind === 'not-found' && way === 'scan';

function EndedPage(
  props: PairOutcomeProps & { state: Ended },
): React.JSX.Element {
  const kind = kindOf(props.state);

  if (isLocalNetwork(kind)) return <LocalNetworkPage {...props} kind={kind} />;

  return takesAddress(kind, props.way) ? (
    <NotFoundView
      serverName={props.state.serverName}
      onTryAgain={props.pairing.retry}
      onScanAgain={props.pairing.back}
    />
  ) : (
    <PlainPage {...props} kind={kind} />
  );
}

// Every other ending names one way on: a new code for a code that is no good, and the same one again for a Server that was not found.
function PlainPage(
  props: PairOutcomeProps & { state: Ended; kind: Page },
): React.JSX.Element {
  const { pairing, kind } = props;

  return (
    <PairPageView
      kind={kind}
      serverName={props.state.serverName}
      way={props.way}
      onAction={kind === 'not-found' ? () => pairing.retry() : pairing.back}
    />
  );
}

// The way out is the Server list, or the scanner where this page is the only one there is.
function LocalNetworkPage(
  props: PairOutcomeProps & { state: Ended; kind: LocalNetworkKind },
): React.JSX.Element {
  const router = useRouter();
  const leave = router.canGoBack() ? router.back : props.pairing.back;

  return (
    <LocalNetworkView
      kind={props.kind}
      serverName={props.state.serverName}
      onOpenSettings={() => void Linking.openSettings()}
      onBack={leave}
      onTryAgain={() => props.pairing.retry()}
    />
  );
}
