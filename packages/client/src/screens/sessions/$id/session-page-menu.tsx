import { errorToast } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useTRPC } from '#features/connection';
import {
  ArchiveSessionAlert,
  RenameSessionDialog,
  type SessionMenu,
} from '#features/sessions';
import {
  leaveForSessions,
  sessionHref,
} from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import { type ArchiveSession, useArchiveSession } from '../use-archive-session';
import {
  type RenamableSession,
  type RenameSession,
  useRenameSession,
} from '../use-rename-session';
import type { SessionDetailViewProps } from './session-detail-view';
import { type PageRename, useRenamedTitle } from './use-renamed-title';

type SessionMenuHandlers = Pick<
  SessionMenu,
  'onRename' | 'onArchive' | 'handoff'
>;

export interface SessionPageMenu {
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

interface SessionActions {
  page: PageRename;
  rename: RenameSession;
  archive: ArchiveSession;
}

// The page under its renamed title, with Rename for it and Archive that leaves it.
function useSessionActions(
  sessionId: string,
  props: SessionDetailViewProps,
): SessionActions {
  const page = useRenamedTitle(props);

  return {
    page,
    rename: useRenameSession(renamable(sessionId, page.props), page.onRenamed),
    archive: useArchiveSession(leaveForSessions),
  };
}

// Rename and Archive from the header's menu, as the Session's row offers them. Archiving leaves the Session for the list.
export function useSessionPageMenu(
  sessionId: string,
  props: SessionDetailViewProps,
): SessionPageMenu {
  const { page, rename, archive } = useSessionActions(sessionId, props);

  const handoff = useHandoff(sessionId);

  const handlers = {
    handoff,
    onRename: (): void => rename.onRename(sessionId),
    onArchive: (): void => archive.onArchive(sessionId),
  };

  return {
    props: withMenuHandlers(page.props, handlers),
    dialogs: sessionDialogs(rename, archive),
  };
}

function useHandoff(sessionId: string): NonNullable<SessionMenu['handoff']> {
  const trpc = useTRPC();
  const navigate = useNavigateFromShown();

  const handoff = useMutation(
    trpc.session.handoff.mutationOptions({
      onSuccess: (next) => navigate(sessionHref(next.sessionId)),
      onError: (error) => {
        const toast = errorToast('Handoff failed', error);

        if (toast) showToast({ ...toast, tone: 'danger' });
      },
    }),
  );

  return {
    pending: handoff.isPending,
    onPress: () => handoff.mutate({ sessionId }),
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
