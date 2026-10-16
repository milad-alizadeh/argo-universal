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
export const renameFailedMessage = 'Couldn’t rename the Session. Try again.';

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

// The Session being renamed, and `session.rename`: success closes the dialog and refreshes the list; failure keeps it open with the reason.
export function useRenameSession(sessions: SessionInfo[]): RenameSession {
  const [sessionId, setSessionId] = useState<string>();
  const rename = useRenameMutation(() => setSessionId(undefined));
  const { reset } = rename;

  const onRename = useCallback(
    (id: string) => {
      reset();
      setSessionId(id);
    },
    [reset],
  );

  const session = sessions.find((listed) => listed.sessionId === sessionId);

  return { onRename, dialog: dialogProps(session, rename, setSessionId) };
}

function dialogProps(
  session: SessionInfo | undefined,
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

function useRenameMutation(onRenamed: () => void): RenameMutation {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.session.rename.mutationOptions(),
    onSuccess: async () => {
      onRenamed();
      await queryClient.invalidateQueries(trpc.session.list.pathFilter());
    },
  });
}
