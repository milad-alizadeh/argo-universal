import type { ContentBlock } from '@repo/contracts';
import { blobsFolderIn, attachmentsFolderIn } from '../blob';
import { readAcpPromptContent } from './acp/prompts/prompt-content';
import type { LocalSubmission } from './acp/prompts/submission';
import type { SessionContext } from './session-context';

export async function prepareQueuedPrompt(
  context: SessionContext,
): Promise<LocalSubmission | null> {
  await context.queueCommitted;
  const submission = requireSubmission(context);
  const answer = await runHook(context, submission);

  if ('drop' in answer) return null;
  await validateQueuedContent(context, answer.prompt);

  return { ...submission, content: answer.prompt };
}

function requireSubmission(context: SessionContext): LocalSubmission {
  if (!context.pendingSubmission) throw new Error('No Queued Prompt selected');

  return context.pendingSubmission;
}

function runHook(
  context: SessionContext,
  submission: LocalSubmission,
): ReturnType<SessionContext['input']['hooks']['prompt.submit']> {
  return context.input.hooks['prompt.submit']({
    sessionId: context.sessionId,
    projectId: context.projectId,
    prompt: submission.content,
  });
}

async function validateQueuedContent(
  context: SessionContext,
  content: ContentBlock[],
): Promise<void> {
  if (!context.acpLease) throw new Error('The Agent is unavailable');
  await readAcpPromptContent({
    content,
    capabilities: promptCapabilities(context.acpLease),
    storage: queueStorage(context),
  });
}

function queueStorage({
  input,
}: SessionContext): Parameters<typeof readAcpPromptContent>[0]['storage'] {
  return {
    database: input.database,
    blobsFolder: blobsFolderIn(input.runtimeDirectory),
    attachmentsFolder: attachmentsFolderIn(input.runtimeDirectory),
  };
}

function promptCapabilities(
  lease: NonNullable<SessionContext['acpLease']>,
): NonNullable<
  NonNullable<
    typeof lease.initialization.agentCapabilities
  >['promptCapabilities']
> {
  return lease.initialization.agentCapabilities?.promptCapabilities ?? {};
}
