import type { Plan, SessionSnapshot } from '@repo/contracts';
import type { useAgents } from '#features/agents';
import type {
  ComposerConfigurationProps,
  ComposerProps,
} from '#features/composer';
import type { useBlobUrl } from '#features/connection';
import type { useSessionFeed } from '#features/feed';
import type { ElicitationFormProps } from '#features/requests';
import type { useNavigate } from '#lib/product/navigation/context';
import { composerStatus } from '../state/composer-status';
import { toSendError } from '../state/send-error';
import type { SessionCommands } from './use-session-commands';

type SessionFeed = ReturnType<typeof useSessionFeed>;

export interface OpenSession {
  sessionId: string;
  feed: SessionFeed;
  snapshot: SessionSnapshot;
  view: NonNullable<SessionFeed['view']>;
  commands: SessionCommands;
  agents: ReturnType<typeof useAgents>;
  navigate: ReturnType<typeof useNavigate>;
  imageUrl: ReturnType<typeof useBlobUrl>;
  connected: boolean;
  elicitation: ElicitationFormProps | undefined;
}

type DraftProps = Pick<
  ComposerProps,
  | 'draft'
  | 'onDraftChange'
  | 'onAttachImages'
  | 'onAttachFiles'
  | 'onDropFiles'
  | 'onSend'
>;

const isTurnRunning = (snapshot: SessionSnapshot): boolean =>
  snapshot.state !== 'idle';

const isConfiguring = ({ snapshot, commands }: OpenSession): boolean =>
  !isTurnRunning(snapshot) && commands.setConfigOption.isPending;

const isSending = (open: OpenSession): boolean =>
  open.commands.uploading ||
  open.commands.promptSession.isPending ||
  isConfiguring(open);

const writtenPlan = (plan: Plan | null): ComposerProps['writtenPlan'] =>
  plan && plan.type !== 'items' ? plan : undefined;

const sendError = (commands: SessionCommands): ComposerProps['error'] =>
  toSendError({
    attachment: commands.attachmentError,
    prompt: commands.promptSession.error,
    configuration: commands.setConfigOption.error,
  });

const checkoutProps = (
  checkout: SessionSnapshot['checkout'],
): ComposerConfigurationProps['checkout'] => ({
  branch: checkout.branch ?? '',
  newWorktree: checkout.type === 'worktree',
  path: checkout.path,
});

function configurationProps(open: OpenSession): ComposerConfigurationProps {
  const { snapshot, agents, navigate } = open;

  return {
    agents: agents.data ?? [],
    agent: snapshot.agent,
    configOptions: snapshot.configOptions,
    onConfigChange: open.commands.changeConfig,
    onAgentSetup: (setup) => navigate({ to: 'settings-agent', agent: setup }),
    onAgentRetry: agents.retry,
    turnRunning: isTurnRunning(snapshot),
    checkout: checkoutProps(snapshot.checkout),
  };
}

const draftProps = (commands: SessionCommands): DraftProps => ({
  draft: commands.draft,
  onDraftChange: commands.changeDraft,
  onAttachImages: () => void commands.attachImages(),
  onAttachFiles: () => void commands.attachFiles(),
  onDropFiles: (dropped) => void commands.attachDroppedFiles(dropped),
  onSend: (sent) => void commands.sendDraft(sent),
});

// The Composer of an open Session: its draft, its commands and its configuration.
export function sessionComposerProps(open: OpenSession): ComposerProps {
  const { commands, sessionId, snapshot, view } = open;

  return {
    ...draftProps(commands),
    onStop: () => commands.cancelTurn.mutate({ sessionId }),
    sending: isSending(open),
    sendable: open.connected,
    error: sendError(commands),
    writtenPlan: writtenPlan(view.plan),
    status: composerStatus(view.plan, snapshot.usage ?? undefined),
    configuration: configurationProps(open),
  };
}
