import type { ReactElement } from 'react';
import {
  ArchiveSessionAlert,
  RenameSessionDialog,
  type SessionMenu,
} from '#features/sessions';
import { leaveForSessions } from '#lib/product/navigation/navigation';
import { type ArchiveSession, useArchiveSession } from '../use-archive-session';
import {
  type RenamableSession,
  type RenameSession,
  useRenameSession,
} from '../use-rename-session';
import type { SessionDetailViewProps } from './session-detail-view';

type SessionMenuHandlers = Pick<SessionMenu, 'onRename' | 'onArchive'>;

interface SessionPageMenu {
  // The page's props, with Rename and Archive in the open Session's header menu.
  props: SessionDetailViewProps;
  // The rename dialog, and the phones' alert before archiving.
  dialogs: ReactElement;
}

// The one Session the page can rename: the open one, under its title.
const renamable = (
  sessionId: string,
  props: SessionDetailViewProps,
): RenamableSession[] =>
  props.state === 'open' ? [{ sessionId, title: props.header.title }] : [];

// Rename and Archive from the header's menu, as the Session's row offers them. Archiving leaves the Session for the list.
export function useSessionPageMenu(
  sessionId: string,
  props: SessionDetailViewProps,
): SessionPageMenu {
  const rename = useRenameSession(renamable(sessionId, props));
  const archive = useArchiveSession(leaveForSessions);

  const handlers = {
    onRename: (): void => rename.onRename(sessionId),
    onArchive: (): void => archive.onArchive(sessionId),
  };

  return {
    props: withMenuHandlers(props, handlers),
    dialogs: sessionDialogs(rename, archive),
  };
}

function sessionDialogs(
  rename: RenameSession,
  archive: ArchiveSession,
): ReactElement {
  return (
    <>
      <RenameSessionDialog {...rename.dialog} />
      <ArchiveSessionAlert {...archive.alert} />
    </>
  );
}

function withMenuHandlers(
  props: SessionDetailViewProps,
  handlers: SessionMenuHandlers,
): SessionDetailViewProps {
  if (props.state !== 'open' || !props.header.menu) return props;

  const menu = { ...props.header.menu, ...handlers };

  return { ...props, header: { ...props.header, menu } };
}
