import { useRouter } from 'expo-router';
import type * as React from 'react';
import { Linking } from 'react-native';
import type { PairPhase, PairServer } from '#features/servers';
import type { PairWay } from './pair-copy';
import { PairPageView } from './pair-page-view';
import type { PairSheetKind } from './pair-sheet-copy';
import { PairSheetView } from './pair-sheet-view';

// What the page after a scan draws: the look and the wait over the scanner, or how the attempt ended.
export type Shown =
  | Exclude<PairPhase, { phase: 'scanning' | 'looking' }>
  | { phase: 'looking'; serverName: string };

type Ended = Extract<Shown, { phase: 'failed' }>;

type OutcomeKind = Ended['outcome']['kind'];

type SheetOutcome = Extract<OutcomeKind, PairSheetKind>;

type PlainKind = Exclude<OutcomeKind, SheetOutcome>;

// A typed code is asked of the Servers on the network before any can be named, and the entry page draws that look itself.
export const shown = (state: PairPhase): state is Shown =>
  state.phase !== 'scanning' &&
  !(state.phase === 'looking' && !state.serverName);

const sheetOutcomes: ReadonlySet<OutcomeKind> = new Set([
  'denied',
  'undetermined',
  'misconfigured',
  'not-found',
]);

const isSheet = (kind: OutcomeKind): kind is SheetOutcome =>
  sheetOutcomes.has(kind);

// A build that cannot look is a fault only its developers can mend: the page that says so is for debug builds, and a release build says what it would for any Server it did not find, after logging.
const kindOf = (ended: Ended): OutcomeKind =>
  ended.outcome.kind === 'misconfigured' && !__DEV__
    ? 'not-found'
    : ended.outcome.kind;

export interface PairOutcomeProps {
  pairing: PairServer;
  state: Shown;
  way: PairWay;
}

// Cancelling the look or the wait and scanning again are one thing; every ending that is no sheet leads back to the scanner.
export function PairOutcome(props: PairOutcomeProps): React.JSX.Element {
  const { state } = props;

  return state.phase === 'failed' ? (
    <EndedPage {...props} state={state} />
  ) : (
    <PendingPage {...props} state={state} />
  );
}

function PendingPage(
  props: PairOutcomeProps & { state: Exclude<Shown, { phase: 'failed' }> },
): React.JSX.Element {
  const { serverName } = props.state;

  return props.state.phase === 'looking' ? (
    <SheetPage {...props} kind="finding" serverName={serverName} />
  ) : (
    <PairPageView
      kind="waiting"
      serverName={serverName}
      way={props.way}
      onAction={props.pairing.back}
    />
  );
}

// A typed code was typed with its own address, so its not-found page is the plain one.
const typedNotFound = (kind: OutcomeKind, way: PairWay): boolean =>
  kind === 'not-found' && way === 'type';

function EndedPage(
  props: PairOutcomeProps & { state: Ended },
): React.JSX.Element {
  const kind = kindOf(props.state);
  const { serverName } = props.state;

  if (typedNotFound(kind, props.way))
    return <PlainPage {...props} kind="not-found" />;

  return isSheet(kind) ? (
    <SheetPage {...props} kind={kind} serverName={serverName} />
  ) : (
    <PlainPage {...props} kind={kind} />
  );
}

// Every other ending names one way on: a new code for a code that is no good, and the same one again for a Server that was not found.
function PlainPage(
  props: PairOutcomeProps & { state: Ended; kind: PlainKind | 'not-found' },
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
const useLeave = (pairing: PairServer): (() => void) => {
  const router = useRouter();

  return router.canGoBack() ? router.back : pairing.back;
};

const openSettings = (): void => void Linking.openSettings();

function SheetPage(
  props: PairOutcomeProps & { kind: PairSheetKind; serverName: string },
): React.JSX.Element {
  const { pairing } = props;

  return (
    <PairSheetView
      kind={props.kind}
      serverName={props.serverName}
      onOpenSettings={openSettings}
      onBack={useLeave(pairing)}
      onTryAgain={pairing.retry}
      onCancel={pairing.back}
    />
  );
}
