import type { SessionSnapshot } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { useMutation } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type * as React from 'react';
import { useAgents } from '#features/agents';
import { type ComposerDraft, useImageDraft } from '#features/composer';
import {
  useConnectionState,
  useResubscribeOnReconnect,
} from '#features/connection';
import { useBlobUrl } from '#features/connection';
import type { ClientError } from '#features/connection';
import { useTRPC } from '#features/connection';
import { useSessionFeed } from '#features/feed';
import { useNavigate } from '#lib/product/navigation/context';
import type { SessionHeaderStatus } from '../components/session-header';
import {
  SessionView,
  type SessionViewProps,
} from '../components/session-view/session-view';
import {
  type SetConfigOptionMutation,
  useSessionConfigChange,
} from '../hooks/use-session-config-change';
import { composerStatus } from '../state/composer-status';
import { toSendError } from '../state/send-error';

type SessionMutation<Name extends 'prompt' | 'cancel'> = ReturnType<
  typeof useMutation<
    inferRouterOutputs<AppRouter>['session'][Name],
    ClientError,
    inferRouterInputs<AppRouter>['session'][Name],
    undefined
  >
>;
type SessionCommands = Omit<
  ReturnType<typeof useImageDraft>,
  'clearDraft' | 'uploadDraftAsPrompt'
> & {
  promptSession: SessionMutation<'prompt'>;
  cancelTurn: SessionMutation<'cancel'>;
  setConfigOption: SetConfigOptionMutation;
  changeConfig: (configId: string, value: string | boolean) => void;
  sendDraft: (sent: ComposerDraft) => Promise<void>;
};

export interface SessionScreenProps {
  id: string;
}

const headerStatus = {
  running: 'running',
  requires_action: 'needs_input',
  idle: 'idle',
} satisfies Record<SessionSnapshot['state'], SessionHeaderStatus>;

// One Session. A new id starts every piece of state over.
export function SessionScreen({ id }: SessionScreenProps): React.JSX.Element {
  return <ConnectedSession key={id} sessionId={id} />;
}

function ConnectedSession({
  sessionId,
}: {
  sessionId: string;
}): React.JSX.Element {
  return <SessionView {...useSessionViewProps(sessionId)} />;
}

function useSessionViewProps(sessionId: string): SessionViewProps {
  const navigate = useNavigate();
  const imageUrl = useBlobUrl();
  const connected = useConnectionState() === 'open';
  const feed = useSessionFeed(sessionId);
  const agents = useAgents();
  const commands = useSessionCommands(
    sessionId,
    feed.resumeAfterCommand,
    feed.snapshot?.agent,
  );
  const { promptSession, cancelTurn, setConfigOption } = commands;
  // A Session the Server refused to open tries again when the Connection reopens; its toast already said why.
  useResubscribeOnReconnect({
    status: feed.openError ? 'error' : 'idle',
    reset: feed.retryOpen,
  });

  // A failed first page refetches by itself when the Connection reopens or the window regains focus.
  if (feed.error) return { state: 'failed' };
  if (feed.openError)
    return { state: 'failed', reason: feed.openError.message };
  const { snapshot, view } = feed;
  if (!feed.ready || !snapshot || !view) return { state: 'opening' };

  const turnRunning = snapshot.state !== 'idle';
  return {
    state: 'open',
    header: {
      title: snapshot.title,
      status: headerStatus[snapshot.state],
      startedAt: snapshot.liveHeader?.startedAt ?? null,
    },
    feed: {
      items: view.items,
      liveHeader: snapshot.liveHeader,
      liveToolCall: feed.liveToolCall,
      loadingOlder: feed.loadingOlder,
      onStartReached: () => void feed.loadOlder(),
      imageUrl,
      checkoutBranch: snapshot.checkout.branch ?? undefined,
    },
    composer: {
      draft: commands.draft,
      onDraftChange: commands.changeDraft,
      onAttachImages: () => void commands.attachImages(),
      onSend: (sent) => void commands.sendDraft(sent),
      onStop: () => cancelTurn.mutate({ sessionId }),
      sending:
        commands.uploading ||
        promptSession.isPending ||
        (!turnRunning && setConfigOption.isPending),
      sendable: connected,
      error: toSendError({
        attachment: commands.attachmentError,
        prompt: promptSession.error,
        configuration: setConfigOption.error,
      }),
      writtenPlan:
        view.plan && view.plan.type !== 'items' ? view.plan : undefined,
      status: composerStatus(view.plan, snapshot.usage ?? undefined),
      configuration: {
        agents: agents.data ?? [],
        agent: snapshot.agent,
        configOptions: snapshot.configOptions,
        onConfigChange: commands.changeConfig,
        onAgentSetup: (setup) =>
          navigate({ to: 'settings-agent', agent: setup }),
        onAgentRetry: agents.retry,
        turnRunning,
        checkout: {
          branch: snapshot.checkout.branch ?? '',
          newWorktree: snapshot.checkout.type === 'worktree',
          path: snapshot.checkout.path,
        },
      },
    },
  };
}

// Draft uploads and successful commands resume a Feed that has closed.
function useSessionCommands(
  sessionId: string,
  resumeAfterCommand: () => void,
  agent: string | undefined,
): SessionCommands {
  const trpc = useTRPC();
  const { clearDraft, uploadDraftAsPrompt, ...draft } = useImageDraft();
  const promptSession = useMutation(
    trpc.session.prompt.mutationOptions({
      onSuccess: () => {
        clearDraft();
        resumeAfterCommand();
      },
    }),
  );
  const cancelTurn = useMutation(
    trpc.session.cancel.mutationOptions({ onSuccess: resumeAfterCommand }),
  );
  const { setConfigOption, change: changeConfig } = useSessionConfigChange(
    sessionId,
    agent,
    resumeAfterCommand,
  );
  async function sendDraft(sent: ComposerDraft): Promise<void> {
    promptSession.reset();
    const prompt = await uploadDraftAsPrompt(sent);
    if (prompt?.length) promptSession.mutate({ sessionId, prompt });
  }
  return {
    ...draft,
    promptSession,
    cancelTurn,
    setConfigOption,
    changeConfig,
    sendDraft,
  };
}
