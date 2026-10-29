import { startingRank, type SessionConfigOption } from '@repo/contracts';
import type { AcpSessionLease } from '../agents';
import { attachmentsFolderIn, blobsFolderIn } from '../blob';
import { publishTurnContent, type FeedActorRef } from '../feed';
import { readAcpConfiguration } from './acp/acp-configuration';
import type {
  AcpPromptRequest as PromptRequest,
  AcpPromptResponse as PromptResponse,
} from './acp/prompts/prompt-types';
import { commitLocalPrompt } from './acp/prompts/submission';
import { validateConfigChoice } from './session-admission';
import type { SessionContext } from './session-context';

export type OpenedAcpSession = {
  lease: AcpSessionLease;
  configOptions: SessionConfigOption[];
};

export type AcpOperationInput = {
  context: SessionContext;
  findFeed: () => FeedActorRef | undefined;
};

export const cancelAcp = (context: SessionContext): Promise<void> => {
  if (!context.acpLease) throw new Error('No active ACP Session');

  return context.acpLease.agent.notify('session/cancel', {
    sessionId: context.acpLease.sessionId,
  });
};

export const configureAcp = async (
  context: SessionContext,
): Promise<SessionConfigOption[]> => {
  const { acpLease, applyingConfig } = context;

  if (!acpLease || !applyingConfig)
    throw new Error('No Session configuration operation');
  const { configId, value } = applyingConfig;
  validateConfigChoice(context.configOptions, applyingConfig);

  const response = context.acpResponseReaders[
    'session/set_config_option'
  ].parse(
    await acpLease.agent.request<unknown>('session/set_config_option', {
      sessionId: acpLease.sessionId,
      configId,
      value,
      ...(typeof value === 'boolean' && { type: 'boolean' }),
    }),
  );

  return readAcpConfiguration(
    response.configOptions,
    context.acpConfigurationRejections,
  );
};

export const publishTurn = (input: AcpOperationInput): Promise<void> => {
  const feed = input.findFeed();

  if (!feed || !input.context.activeTurnId) return Promise.resolve();

  return publishTurnContent(
    feed,
    input.context.activeTurnId,
    input.context.turnEnding,
  );
};

export const commitPrompt = (
  input: AcpOperationInput,
  signal: AbortSignal,
): Promise<PromptRequest> => {
  const { pendingSubmission, acpLease, input: sessionInput } = input.context;
  const feed = input.findFeed();

  if (!pendingSubmission || !acpLease || !feed)
    throw new Error('No Session submission destination');

  return commitLocalPrompt(
    {
      submission: pendingSubmission,
      lease: acpLease,
      feed,
      storage: {
        database: sessionInput.database,
        blobsFolder: blobsFolderIn(sessionInput.runtimeDirectory),
        attachmentsFolder: attachmentsFolderIn(sessionInput.runtimeDirectory),
      },
    },
    signal,
  );
};

export const promptAcp = async (
  context: SessionContext,
): Promise<PromptResponse> => {
  if (!context.acpLease || !context.acpPrompt)
    throw new Error('No admitted ACP prompt');

  const lease = context.acpLease;

  return context.acpResponseReaders['session/prompt'].parse(
    await lease.agent
      .request<unknown>('session/prompt', context.acpPrompt)
      .catch(lease.rejectRequest),
  );
};

export const openAcp = async (
  context: SessionContext,
): Promise<OpenedAcpSession> => {
  const lease = await context.acpLifetime.open(context);

  return {
    lease,
    configOptions: readAcpConfiguration(
      lease.response.configOptions,
      context.acpConfigurationRejections,
    ),
  };
};

// Resume can return Agent defaults. Reapply the Session's durable choices before admitting a Turn.
export const restoreAcpConfiguration = async (
  context: SessionContext,
  signal: AbortSignal,
): Promise<SessionConfigOption[]> => {
  let options = context.configOptions;
  const pending = [...context.configValues];

  while (pending.length > 0) {
    signal.throwIfAborted();
    pending.sort(
      (left, right) =>
        configurationRank(options, left.configId) -
        configurationRank(options, right.configId),
    );
    const choice = pending.shift();

    if (choice) options = await restoreConfigChoice(context, options, choice);
  }

  signal.throwIfAborted();

  return options;
};

function configurationRank(
  options: SessionConfigOption[],
  configId: string,
): number {
  return startingRank(
    options.find((option) => option.configId === configId) ?? { configId },
  );
}

async function restoreConfigChoice(
  context: SessionContext,
  options: SessionConfigOption[],
  choice: SessionContext['configValues'][number],
): Promise<SessionConfigOption[]> {
  validateConfigChoice(options, choice);

  if (
    options.find((option) => option.configId === choice.configId)
      ?.currentValue === choice.value
  )
    return options;

  const restored = await configureAcp({
    ...context,
    configOptions: options,
    applyingConfig: { type: 'session.setConfigOption', ...choice },
  });

  if (
    restored.find((option) => option.configId === choice.configId)
      ?.currentValue !== choice.value
  )
    throw new Error(
      `The Agent did not restore ${choice.configId}=${String(choice.value)}`,
    );

  return restored;
}

// The Agent's last Turn content reaches the Feed even when the connection is lost.
export const closeAcp = async (input: AcpOperationInput): Promise<void> => {
  await input.context.acpLifetime.close(
    input.context.archiveRequested ? 'stopped' : 'lost',
  );
  await publishActiveTurnContent(input);
};

const publishActiveTurnContent = (input: AcpOperationInput): Promise<void> => {
  if (!input.context.activeTurnId) return Promise.resolve();
  const feed = input.findFeed();

  if (!feed || feed.getSnapshot().status !== 'active') return Promise.resolve();

  return publishTurnContent(
    feed,
    input.context.activeTurnId,
    input.context.turnEnding,
  );
};
