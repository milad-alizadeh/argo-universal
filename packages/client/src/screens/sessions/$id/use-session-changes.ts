import type { SessionSnapshot } from '@repo/contracts';
import { useMemo } from 'react';
import {
  type ChangesRevision,
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

function useOpenChanges(
  sessionId: string,
  panels: SessionPanels,
  feed: CheckoutSignals,
): OpenChanges {
  const header = changesHeader(panels, feed);
  const revision = useCheckoutRevision(feed);

  return {
    header,
    changes: useChanges({ sessionId, open: header.open, revision }),
  };
}

// The open Session's Changes, loaded while its Changes tab is shown.
export function useChangedSession(
  sessionId: string,
  props: SessionDetailViewProps,
  feed: CheckoutSignals,
): SessionDetailViewProps {
  const panels = useInspectorPanels(props.state === 'open' ? props : {});
  const { header, changes } = useOpenChanges(sessionId, panels, feed);

  if (props.state !== 'open') return props;

  return {
    ...props,
    inspectorPanels: panels,
    changes,
    header: { ...props.header, changes: header },
  };
}
