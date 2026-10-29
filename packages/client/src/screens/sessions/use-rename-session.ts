import type {
  SessionInfo,
  SessionRenameInput,
  SessionRenameOutput,
} from '@repo/contracts';
import {
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { type ClientError, useTRPC } from '#features/connection';
import type { RenameSessionDialogProps } from '#features/sessions';

// What the rename dialog says when the Server refuses the new title or cannot be reached.
const renameFailedMessage = 'Couldn’t rename the Session. Try again.';

type RenameMutation = UseMutationResult<
  SessionRenameOutput,
  ClientError,
  SessionRenameInput
>;

export interface RenameSession {
  // Opens the dialog for a listed Session; it keeps one identity, so the rows it reaches stay memoised.
  onRename: (sessionId: string) => void;
  dialog: RenameSessionDialogProps;
}

// The Sessions a page can rename: a list's rows, or the one Session a page shows.
export type RenamableSession = Pick<SessionInfo, 'sessionId' | 'title'>;

// What a successful rename asked for: the Session, and its new title.
type Renamed = (renamed: SessionRenameInput) => void;

/*
 * The Session being renamed, and `session.rename`: success closes the dialog, refreshes the list and tells `onRenamed`;
 * failure keeps it open and says so.
 */
export function useRenameSession(
  sessions: RenamableSession[],
  onRenamed?: Renamed,
): RenameSession {
  const [sessionId, setSessionId] = useState<string>();

  const rename = useRenameMutation((renamed) => {
    setSessionId(closedAfter(renamed.sessionId));
    onRenamed?.(renamed);
  });

  const onRename = useOpenRename(rename.reset, setSessionId);

  const session = sessions.find((listed) => listed.sessionId === sessionId);

  return { onRename, dialog: dialogProps(session, rename, setSessionId) };
}

// Opening the dialog clears the last attempt's error.
function useOpenRename(
  reset: () => void,
  setSessionId: (id: string) => void,
): RenameSession['onRename'] {
  return useCallback(
    (id: string) => {
      reset();
      setSessionId(id);
    },
    [reset, setSessionId],
  );
}

// A late success closes only its own Session's dialog, not one opened since.
const closedAfter =
  (renamed: string) =>
  (open: string | undefined): string | undefined =>
    open === renamed ? undefined : open;

function dialogProps(
  session: RenamableSession | undefined,
  rename: RenameMutation,
  setSessionId: (id: string | undefined) => void,
): RenameSessionDialogProps {
  return {
    title: session?.title ?? '',
    open: session !== undefined,
    error: renameError(rename),
    onRename: (title) =>
      session && rename.mutate({ sessionId: session.sessionId, title }),
    onClose: () => setSessionId(undefined),
  };
}

const renameError = (rename: RenameMutation): string | undefined =>
  rename.isError ? renameFailedMessage : undefined;

function useRenameMutation(onRenamed: Renamed): RenameMutation {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.session.rename.mutationOptions(),
    onSuccess: async (_renamed, input) => {
      onRenamed(input);
      await queryClient.invalidateQueries(trpc.session.list.pathFilter());
    },
  });
}
