import { useIsPreview } from 'expo-router';
import type * as React from 'react';
import { newSessionId } from '../../../lib/product/navigation/new-session';
import { ConnectedReplaceableSlots } from '../../plugins/connected-replaceable-slot';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';
import { SessionNewScreen } from './session-new-screen';
import { ConnectedSessionHeader } from './session-page-header';
import { type SessionPageMenu, useSessionPageMenu } from './session-page-menu';
import { sessionHeader } from './session-plugin-cards';
import { type SessionPage, useSessionPage } from './use-session-page';
import type { WorkbenchCards } from './use-workbench-cards';

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
    <ConnectedReplaceableSlots>
      {id === newSessionId ? (
        <SessionNewScreen projectId={projectId} draft={draft} />
      ) : (
        <ConnectedSession key={id} sessionId={id} />
      )}
    </ConnectedReplaceableSlots>
  );
}

// iOS's long-press preview draws the page outside its stack: it takes no header, and a peek does not mark the Session seen.
function ConnectedSession({
  sessionId,
}: Pick<SessionPage, 'sessionId'>): React.JSX.Element {
  const { preview, ...page } = useConnectedSession(sessionId);

  // The card views are held beside the page either way, so a preview draws the same cards.
  return (
    <>
      {preview ? (
        <SessionDetailView {...previewed(page.props)} />
      ) : (
        <OpenedSession sessionId={sessionId} {...page} />
      )}
      {page.cards.held}
    </>
  );
}

type Opened = SessionPageMenu & { cards: WorkbenchCards };

function useConnectedSession(sessionId: string): Opened & { preview: boolean } {
  const preview = useIsPreview();
  const { props, cards } = useSessionPage({ sessionId, preview });

  return { preview, cards, ...useSessionPageMenu(sessionId, props) };
}

function OpenedSession({
  sessionId,
  props,
  dialogs,
  cards,
}: Opened & Pick<SessionPage, 'sessionId'>): React.JSX.Element {
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
