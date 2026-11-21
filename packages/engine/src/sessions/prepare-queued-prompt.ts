import type { ContentBlock } from '@repo/contracts';
import { blobsFolderIn, attachmentsFolderIn } from '../blob';
import { requireNativeCommandAuthority } from './acp/prompts/native-command';
import { readAcpPromptContent } from './acp/prompts/prompt-content';
import type { LocalSubmission } from './acp/prompts/submission';
import { allowsResult } from './orchestration/result-store';
import { requireConfirmedSkill } from './orchestration/skill';
import type { SessionContext } from './session-context';

type Preparation = Pick<
  SessionContext,
  | 'queueCommitted'
  | 'pendingSubmission'
  | 'sessionId'
  | 'projectId'
  | 'acpLease'
  | 'slashCommands'
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
  requireNativeCommandAuthority(answer.prompt, submission.sender);
  await validateQueuedContent(context, answer.prompt);
  const { sender } = submission;
  if (sender?.type === 'skill') {
    const [command] = answer.prompt;
    const text =
      answer.prompt.length === 1 && command?.type === 'text' && !command._meta
        ? command.text
        : undefined;
    requireConfirmedSkill(context, sender.offerId, text);
  }
  if (
    sender?.type === 'session' &&
    sender.delegatedResult &&
    !allowsResult(
      context.input.database,
      context.sessionId,
      sender.delegatedResult,
    )
  )
    return null;

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
