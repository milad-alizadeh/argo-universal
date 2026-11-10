import { SizeClass } from '@repo/kit/size-class/size-class';
import { useIsPreview } from 'expo-router';
import type * as React from 'react';
import { newSessionId } from '../../../lib/product/navigation/new-session';
import { RetainedSessions } from '../../../lib/product/retained-sessions';
import { ConnectedReplaceableSlots } from '../../plugins/connected-replaceable-slot';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';
import { SessionNewScreen } from './session-new-screen';
import { ConnectedSessionHeader } from './session-page-header';
import { type SessionPageMenu, useSessionPageMenu } from './session-page-menu';
import { sessionHeader } from './session-plugin-cards';
import {
  type OpenedSession,
  type SessionPage,
  useSessionPage,
} from './use-session-page';

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
}: SessionDetailScreenProps): React.ReactNode {
  if (id === newSessionId)
    return <SessionNewScreen projectId={projectId} draft={draft} />;

  return <SessionPages id={id} />;
}

// A wide window keeps the Sessions shown last behind the one shown; a phone keeps only the one.
function SessionPages({ id }: { id: string }): React.JSX.Element {
  return (
    <SizeClass
      wide={
        <RetainedSessions sessionId={id}>{retainedSession}</RetainedSessions>
      }
      compact={<ConnectedSession key={id} sessionId={id} />}
    />
  );
}

const retainedSession = (sessionId: string): React.JSX.Element => (
  <ConnectedSession sessionId={sessionId} />
);

// A Feed row a Plugin replaces runs its Operations for this Session and its Project.
function ConnectedSession({
  sessionId,
}: Pick<SessionPage, 'sessionId'>): React.JSX.Element {
  const preview = useIsPreview();
  const opened = useSessionPage({ sessionId, preview });

  return (
    <ConnectedReplaceableSlots session={opened.session}>
      <SessionPageBody
        sessionId={sessionId}
        preview={preview}
        opened={opened}
      />
    </ConnectedReplaceableSlots>
  );
}

// iOS's long-press preview draws the page outside its stack: it takes no header, and a peek does not mark the Session seen.
function SessionPageBody({
  sessionId,
  preview,
  opened,
}: SessionPage & { opened: OpenedSession }): React.JSX.Element {
  const menu = useSessionPageMenu(sessionId, opened.props);

  if (preview) return <SessionDetailView {...previewed(menu.props)} />;

  return headed(sessionId, opened.cards, menu);
}

// The page under its header, with the header menu's dialogs.
function headed(
  sessionId: string,
  cards: OpenedSession['cards'],
  { props, dialogs }: SessionPageMenu,
): React.JSX.Element {
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
