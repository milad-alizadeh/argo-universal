import type { SessionSnapshot } from '@repo/contracts';
import { useMemo } from 'react';
import {
  type ChangesRevision,
  type ChangesSource,
  type ChangesViewProps,
  useChanges,
} from '#features/changes';
import type { SessionHeaderProps, SessionPanels } from '#features/sessions';
import type { SessionDetailViewProps } from './session-detail-view';
import { useInspectorPanels } from './use-inspector-panels';

type ChangesHeader = NonNullable<SessionHeaderProps['changes']>;

// What tells the Changes the Checkout may have moved: the Feed's snapshot and revision.
type CheckoutSignals = {
  snapshot: SessionSnapshot | null;
  revision: number;
};

// A Session page and what its Changes are read from.
export interface ChangedSession {
  sessionId: string;
  props: SessionDetailViewProps;
  feed: CheckoutSignals;
  // The Server, unless a story passes an in-memory stand-in.
  source?: ChangesSource;
}

const changesHeader = (
  panels: SessionPanels,
  source: CheckoutSignals,
): ChangesHeader => ({
  open: panels.state.shown === 'changes',
  onOpenChange: (shown) =>
    shown ? panels.select('changes') : panels.close('changes'),
  summary: source.snapshot?.changes,
});

// A Feed revision reloads patches even when an edit keeps the same line totals; a new snapshot reloads them too.
const useCheckoutRevision = ({
  snapshot,
  revision,
}: CheckoutSignals): ChangesRevision =>
  useMemo(() => ({ snapshot, revision }), [snapshot, revision]);

interface OpenChanges {
  header: ChangesHeader;
  changes: ChangesViewProps;
}

type OpenSessionPage = Extract<SessionDetailViewProps, { state: 'open' }>;

// A Session page draws its Changes while it is open, and nothing while it is still opening or has failed.
const isOpen = ({ props }: ChangedSession): boolean => props.state === 'open';

function useOpenChanges(
  session: ChangedSession,
  panels: SessionPanels,
): OpenChanges {
  const { sessionId, feed, source } = session;
  const revision = useCheckoutRevision(feed);

  return {
    header: changesHeader(panels, feed),
    changes: useChanges({ sessionId, open: isOpen(session), revision }, source),
  };
}

/*
 * The open Session's Changes, loaded while its page is. Every Changes surface summarises this one reading of the
 * Checkout (ADR-0039): the Workbench card and the Session's ⋯ menu as much as the Inspector, so the page loads them
 * whether or not the Inspector's Changes tab is shown.
 */
export function useChangedSession(
  session: ChangedSession,
): SessionDetailViewProps {
  const { props } = session;
  const panels = useInspectorPanels(props.state === 'open' ? props : {});
  const { header, changes } = useOpenChanges(session, panels);

  if (props.state !== 'open') return props;

  return withChanges(props, panels, { ...header, changes });
}

// The open page with its Inspector tabs, its loaded Changes and the Changes its header offers.
const withChanges = (
  props: OpenSessionPage,
  inspectorPanels: SessionPanels,
  { changes, ...header }: ChangesHeader & { changes: ChangesViewProps },
): SessionDetailViewProps => ({
  ...props,
  inspectorPanels,
  changes,
  header: { ...props.header, changes: header },
});
