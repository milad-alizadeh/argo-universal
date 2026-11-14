import type { ContentBlock } from '@repo/contracts';
import { blobsFolderIn, attachmentsFolderIn } from '../blob';
import { readAcpPromptContent } from './acp/prompts/prompt-content';
import type { LocalSubmission } from './acp/prompts/submission';
import type { SessionContext } from './session-context';

type Preparation = Pick<
  SessionContext,
  | 'queueCommitted'
  | 'pendingSubmission'
  | 'sessionId'
  | 'projectId'
  | 'acpLease'
> & {
  input: Pick<
    SessionContext['input'],
    'hooks' | 'database' | 'runtimeDirectory'
  >;
};

export async function prepareQueuedPrompt(
  context: Preparation,
): Promise<LocalSubmission | null> {
  await context.queueCommitted;
  const submission = requireSubmission(context);
  const answer = await runHook(context, submission);

  if ('drop' in answer) return null;
  await validateQueuedContent(context, answer.prompt);

  return { ...submission, content: answer.prompt };
}

function requireSubmission(
  context: Pick<SessionContext, 'pendingSubmission'>,
): LocalSubmission {
  if (!context.pendingSubmission) throw new Error('No Queued Prompt selected');

  return context.pendingSubmission;
}

function runHook(
  context: Pick<Preparation, 'sessionId' | 'projectId' | 'input'>,
  submission: LocalSubmission,
): ReturnType<SessionContext['input']['hooks']['prompt.submit']> {
  return context.input.hooks['prompt.submit']({
    sessionId: context.sessionId,
    projectId: context.projectId,
    prompt: submission.content,
  });
}

async function validateQueuedContent(
  context: Pick<Preparation, 'acpLease' | 'input'>,
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
}: Pick<Preparation, 'input'>): Parameters<
  typeof readAcpPromptContent
>[0]['storage'] {
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
