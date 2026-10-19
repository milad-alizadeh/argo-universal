import type { Plan, SessionSnapshot } from '@repo/contracts';
import { type InstalledAgents, loadedAgents } from '#features/agents';
import type {
  ComposerConfigurationProps,
  ComposerProps,
} from '#features/composer';
import type { useBlobUrl } from '#features/connection';
import type { useSessionFeed } from '#features/feed';
import type {
  ElicitationFormProps,
  PermissionRequestProps,
} from '#features/requests';
import {
  type MergeMethodChoice,
  composerStatus,
  decodeOpenFailure,
  toSendError,
} from '#features/sessions';
import { type Navigate } from '#lib/product/navigation/navigation';
import type { SessionCommands } from './use-session-commands';

type SessionFeed = ReturnType<typeof useSessionFeed>;

export interface OpenSession {
  sessionId: string;
  feed: SessionFeed;
  snapshot: SessionSnapshot;
  view: NonNullable<SessionFeed['view']>;
  commands: SessionCommands;
  agents: InstalledAgents;
  navigate: Navigate;
  imageUrl: ReturnType<typeof useBlobUrl>;
  connected: boolean;
  elicitation: ElicitationFormProps | undefined;
  permission: PermissionRequestProps | undefined;
  mergeMethod: MergeMethodChoice;
  options?: {
    configOptions: SessionSnapshot['configOptions'];
    loading: boolean;
  };
  // The Feed's end came on screen or left it.
  onAtEndChange: (atEnd: boolean) => void;
}

type DraftProps = Pick<
  ComposerProps,
  'draft' | 'onDraftChange' | 'onAttachImages' | 'onAttachFiles' | 'onSend'
>;

const isTurnRunning = (snapshot: SessionSnapshot): boolean =>
  snapshot.state !== 'idle';

const isConfiguring = ({ snapshot, commands }: OpenSession): boolean =>
  !isTurnRunning(snapshot) && commands.setConfigOption.isPending;

const isSending = ({ commands }: OpenSession): boolean =>
  commands.uploading || commands.promptSession.isPending;

// A pending option change holds Send but leaves the Composer and its open configuration active.
const isSendable = (open: OpenSession): boolean =>
  open.connected && !isConfiguring(open);

const writtenPlan = (plan: Plan | null): ComposerProps['writtenPlan'] =>
  plan && plan.type !== 'items' ? plan : undefined;

// A refused open is the callout's to show, not the Composer's.
const commandError = <Failure>(error: Failure | null): Failure | null =>
  decodeOpenFailure(error) ? null : error;

const sendError = (
  commands: SessionCommands,
): Pick<ComposerProps, 'error' | 'errorKey'> => {
  const failure = toSendError({
    attachment: commands.attachmentError,
    prompt: commandError(commands.promptSession.error),
    configuration: commandError(commands.setConfigOption.error),
  });

  return { error: failure?.message, errorKey: failure?.key };
};

const checkoutProps = (
  checkout: SessionSnapshot['checkout'],
): ComposerConfigurationProps['checkout'] => ({
  branch: checkout.branch ?? '',
  newWorktree: checkout.type === 'worktree',
  path: checkout.path,
});

// The Session's Agent among the Installed Agents, found once for the Composer.
const sessionAgent = ({
  snapshot,
  agents,
}: OpenSession): ComposerConfigurationProps['agent'] =>
  loadedAgents(agents).find(({ id }) => id === snapshot.agent);

function configurationProps(open: OpenSession): ComposerConfigurationProps {
  const { snapshot } = open;

  return {
    agent: sessionAgent(open),
    agentId: snapshot.agent,
    ...optionsOf(open),
    onConfigChange: open.commands.changeConfig,
    turnRunning: isTurnRunning(snapshot),
    checkout: checkoutProps(snapshot.checkout),
  };
}

function optionsOf({
  snapshot,
  options,
}: OpenSession): Pick<ComposerConfigurationProps, 'configOptions' | 'opening'> {
  if (snapshot.configOptions.length)
    return { configOptions: snapshot.configOptions, opening: false };

  return discoveredOptions(options);
}

function discoveredOptions(
  options: OpenSession['options'],
): Pick<ComposerConfigurationProps, 'configOptions' | 'opening'> {
  if (!options) return { configOptions: [], opening: undefined };

  return {
    configOptions: options.configOptions,
    opening: options.loading,
  };
}

const draftProps = (commands: SessionCommands): DraftProps => ({
  draft: commands.draft,
  onDraftChange: commands.changeDraft,
  onAttachImages: () => void commands.attachImages(),
  onAttachFiles: () => void commands.attachFiles(),
  onSend: (sent) => void commands.sendDraft(sent),
});

// The Composer of an open Session: its draft, its commands and its configuration.
export function sessionComposerProps(open: OpenSession): ComposerProps {
  const { commands, sessionId, snapshot, view } = open;

  return {
    ...draftProps(commands),
    onStop: () => commands.cancelTurn.mutate({ sessionId }),
    sending: isSending(open),
    sendable: isSendable(open),
    ...sendError(commands),
    permissionRequest: open.permission,
    writtenPlan: writtenPlan(view.plan),
    status: composerStatus(view.plan, snapshot.usage ?? undefined),
    configuration: configurationProps(open),
  };
}
