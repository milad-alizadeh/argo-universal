import { useIsPreview } from 'expo-router';
import type * as React from 'react';
import { newSessionId } from '../../../lib/product/navigation/new-session';
import { ReplaceableSlotRenderer } from '../../../lib/product/plugin-registry';
import { renderConnectedReplaceableSlot } from '../../plugins/connected-replaceable-slot';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';
import { SessionNewScreen } from './session-new-screen';
import { ConnectedSessionHeader } from './session-page-header';
import { useSessionPageMenu } from './session-page-menu';
import { sessionHeader } from './session-plugin-cards';
import { type SessionPage, useSessionPage } from './use-session-page';

export interface SessionDetailScreenProps {
  id: string;
  // New Session's Project, when it was opened from one.
  projectId?: string;
  // New Session's Composer text, when a Plugin opened it with one.
  draft?: string;
}

// One Session, or New Session for the id no Session has: the first prompt's hand-off only changes the id, so the route keeps its screen. A new id starts every piece of state over.
export function SessionDetailScreen({
  id,
  projectId,
  draft,
}: SessionDetailScreenProps): React.JSX.Element {
  return (
    <ReplaceableSlotRenderer value={renderConnectedReplaceableSlot}>
      {id === newSessionId ? (
        <SessionNewScreen projectId={projectId} draft={draft} />
      ) : (
        <ConnectedSession key={id} sessionId={id} />
      )}
    </ReplaceableSlotRenderer>
  );
}

// iOS's long-press preview draws the page outside its stack: it takes no header, and a peek does not mark the Session seen.
function ConnectedSession({
  sessionId,
}: Pick<SessionPage, 'sessionId'>): React.JSX.Element {
  const preview = useIsPreview();
  const { props: opened, cards } = useSessionPage({ sessionId, preview });
  const { props, dialogs } = useSessionPageMenu(sessionId, opened);

  if (preview) return <SessionDetailView {...previewed(props)} />;

  return (
    <>
      <ConnectedSessionHeader {...sessionHeader(sessionId, cards, props)} />
      <SessionDetailView {...props} />
      {dialogs}
    </>
  );
}

const previewed = (props: SessionDetailViewProps): SessionDetailViewProps =>
  props.state === 'open' ? { ...props, preview: true } : props;
