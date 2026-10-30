import type { SessionConfigOption } from '@repo/contracts';
import type { AcpSessionLease } from '../agents';
import { attachmentsFolderIn, blobsFolderIn } from '../blob';
import { publishTurnContent, type FeedActorRef } from '../feed';
import { readAcpConfiguration } from './acp/acp-configuration';
import type {
  AcpPromptRequest as PromptRequest,
  AcpPromptResponse as PromptResponse,
} from './acp/prompts/prompt-types';
import { commitLocalPrompt } from './acp/prompts/submission';
import type { SessionContext } from './session-context';

export type OpenedAcpSession = {
  lease: AcpSessionLease;
  configOptions: SessionConfigOption[];
};

export type AcpOperationInput = {
  context: SessionContext;
  findFeed: () => FeedActorRef | undefined;
};

/*
 * Cancels the Turn, not the commands it started. The Turn ends at once
 * (ADR-0024) and says nothing about any process: only a Shell Argo created is
 * Argo's to end, and it stays running and stoppable until the Session closes.
 * A command the Agent runs inside itself outlives the cancel (#1337).
 */
export const cancelAcp = (context: SessionContext): Promise<void> => {
  if (!context.acpLease) throw new Error('No active ACP Session');

  return context.acpLease.agent.notify('session/cancel', {
    sessionId: context.acpLease.sessionId,
  });
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

const requireFeed = (input: AcpOperationInput): FeedActorRef => {
  const feed = input.findFeed();

  if (!feed) throw new Error('No Session submission destination');

  return feed;
};

const promptStorage = (
  input: SessionContext['input'],
): Parameters<typeof commitLocalPrompt>[0]['storage'] => ({
  database: input.database,
  blobsFolder: blobsFolderIn(input.runtimeDirectory),
  attachmentsFolder: attachmentsFolderIn(input.runtimeDirectory),
});

type PromptDestination = {
  submission: NonNullable<SessionContext['pendingSubmission']>;
  lease: AcpSessionLease;
  feed: FeedActorRef;
  input: SessionContext['input'];
};

const promptDestination = ({
  submission,
  lease,
  feed,
  input,
}: PromptDestination): Parameters<typeof commitLocalPrompt>[0] => ({
  submission,
  lease,
  feed,
  storage: promptStorage(input),
});

const requireDestination = (
  input: AcpOperationInput,
): Parameters<typeof commitLocalPrompt>[0] => {
  const { pendingSubmission, acpLease, input: sessionInput } = input.context;
  const feed = requireFeed(input);

  if (!pendingSubmission || !acpLease)
    throw new Error('No Session submission destination');

  return promptDestination({
    submission: pendingSubmission,
    lease: acpLease,
    feed,
    input: sessionInput,
  });
};

export const commitPrompt = (
  input: AcpOperationInput,
  signal: AbortSignal,
): Promise<PromptRequest> =>
  commitLocalPrompt(requireDestination(input), signal);

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

  if (!isActiveFeed(feed)) return Promise.resolve();

  return publishTurnContent(
    feed,
    input.context.activeTurnId,
    input.context.turnEnding,
  );
};

const isActiveFeed = (feed: FeedActorRef | undefined): feed is FeedActorRef =>
  Boolean(feed && feed.getSnapshot().status === 'active');
