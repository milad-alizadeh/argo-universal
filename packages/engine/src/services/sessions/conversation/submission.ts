import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { ContentBlock } from '@repo/contracts';
import type { Subscription } from 'xstate';
import type { AcpSessionLease } from '../../agents';
import type { BlobStorage } from '../../blob';
import {
  userMessageChange,
  type FeedActorRef,
  type WriterCommit,
} from '../../feed';
import { readAcpPromptContent } from './prompt-content';

export type LocalSubmission = {
  turnId: string;
  content: ContentBlock[];
  committed?: WriterCommit;
};
export type PromptCommitInput = {
  submission: LocalSubmission;
  lease: AcpSessionLease;
  feed: FeedActorRef;
  storage: BlobStorage;
};

const requirePromptAdmission = (
  feed: FeedActorRef,
  signal: AbortSignal,
): void => {
  if (feed.getSnapshot().status !== 'active')
    throw new Error('Session Feed is unavailable');
  signal.throwIfAborted();
};
const rejectPromptStorage = (error: unknown): never => {
  throw new Error('The prompt could not be saved; no Agent work was started', {
    cause: error,
  });
};
const stopWatchingCommitLifetime = (
  subscription: Subscription,
  signal: AbortSignal,
  abort: () => void,
): void => {
  subscription.unsubscribe();
  signal.removeEventListener('abort', abort);
};
const watchCommitLifetime = (
  feed: FeedActorRef,
  committed: PromiseWithResolvers<void>,
  signal: AbortSignal,
): (() => void) => {
  const abort = (): void =>
    committed.reject(new Error('Prompt admission ended before commit'));
  const subscription = feed.subscribe({
    complete: abort,
    error: committed.reject,
  });
  signal.addEventListener('abort', abort, { once: true });
  return () => stopWatchingCommitLifetime(subscription, signal, abort);
};
const enqueuePromptRow = (
  feed: FeedActorRef,
  submission: LocalSubmission,
  committed: WriterCommit,
): void => {
  feed.send({
    type: 'feed.change',
    turnId: submission.turnId,
    change: userMessageChange(submission.turnId, submission.content),
    committed,
  });
};
const enqueuePromptAndWaitForCommit = (
  input: PromptCommitInput,
  signal: AbortSignal,
): Promise<void> => {
  const committed = Promise.withResolvers<void>();
  const detach = watchCommitLifetime(input.feed, committed, signal);
  enqueuePromptRow(input.feed, input.submission, committed);
  return committed.promise.catch(rejectPromptStorage).finally(detach);
};
const readSupportedPromptBlocks = (
  input: PromptCommitInput,
): Promise<PromptRequest['prompt']> =>
  readAcpPromptContent({
    content: input.submission.content,
    capabilities:
      input.lease.initialization.agentCapabilities?.promptCapabilities ?? {},
    storage: input.storage,
  });
export const commitLocalPrompt = async (
  input: PromptCommitInput,
  signal: AbortSignal,
): Promise<PromptRequest> => {
  const prompt = await readSupportedPromptBlocks(input);
  requirePromptAdmission(input.feed, signal);
  await enqueuePromptAndWaitForCommit(input, signal);
  signal.throwIfAborted();
  return { sessionId: input.lease.sessionId, prompt };
};
