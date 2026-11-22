import type { ContentBlock, PromptSender } from '@repo/contracts';
import type { CoreHooks } from '@repo/contracts/plugins';
import type { Database } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { allowsDelegation } from './orchestration/result-store';
import { requireConfirmedSkill } from './orchestration/skill';

type SubmitHook = CoreHooks['prompt.submit'];

type Prompt = { content: ContentBlock[]; sender?: PromptSender };

type Destination = { sessionId: string; database: Database };

type QueuedDestination = Parameters<typeof requireConfirmedSkill>[0];

function nativeLine(content: readonly ContentBlock[]): string | undefined {
  return content.flatMap((block) =>
    block.type === 'text'
      ? block.text
          .split(/\r?\n/u)
          .filter((line) =>
            /^\s*(?:\/\s*[\w$.:-]+|\$[a-z][\w-]*)(?:\s|$)/u.test(line),
          )
      : [],
  )[0];
}

export function requireNativeCommandAuthority(
  content: readonly ContentBlock[],
  sender: PromptSender | undefined,
): void {
  if (!sender || sender.type === 'user' || sender.type === 'skill') return;

  if (nativeLine(content) !== undefined)
    throw new Error(
      'A native command requires a person’s Prompt or confirmation.',
    );
}

// Runs the shared Hook without letting a rewrite grant native command authority.
export async function runPromptSubmitHook(
  hook: SubmitHook,
  input: Parameters<SubmitHook>[0],
): ReturnType<SubmitHook> {
  const answer = await hook(input);

  if (!('drop' in answer))
    requireUnchangedNativeCommand(input.prompt, answer.prompt);

  return answer;
}

function requireUnchangedNativeCommand(
  original: readonly ContentBlock[],
  rewritten: readonly ContentBlock[],
): void {
  if (nativeLine(rewritten) === undefined) return;

  if (JSON.stringify(original) !== JSON.stringify(rewritten))
    throw new Error(
      'A Hook changed a native command. Submit the exact command in the App.',
    );
}

const delegatedResultOf = (
  sender: PromptSender | undefined,
): string[] | undefined =>
  sender?.type === 'session' ? sender.delegatedResult : undefined;

function allowsPromptDelivery(
  { sessionId, database }: Destination,
  sender: PromptSender | undefined,
): boolean {
  const ids =
    sender?.type === 'session' && sender.delegatedInput
      ? [sender.delegatedInput]
      : delegatedResultOf(sender);

  return !ids || allowsDelegation(database, sessionId, ids);
}

// Skill invocations and delegated results must run in their own Turn.
export function requireQueueSteeringAuthority(
  sender: PromptSender | undefined,
): void {
  if (sender?.type === 'skill' || delegatedResultOf(sender))
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'This Prompt must start its own Turn.',
    });
}

function skillCommand(content: ContentBlock[]): string | undefined {
  const [command] = content;

  return content.length === 1 && command?.type === 'text' && !command._meta
    ? command.text
    : undefined;
}

// Queue preparation silently discards a revoked result after validating its content.
export function canDispatchQueuedPrompt(
  context: QueuedDestination,
  { content, sender }: Prompt,
): boolean {
  if (sender?.type === 'skill')
    requireConfirmedSkill(context, sender.offerId, skillCommand(content));

  return allowsPromptDelivery(
    { sessionId: context.sessionId, database: context.input.database },
    sender,
  );
}

// The Feed commit can yield to a workflow close. Check again before ACP dispatch.
export function requireCommittedPromptDispatch(
  destination: Destination,
  sender: PromptSender | undefined,
): void {
  if (!allowsPromptDelivery(destination, sender))
    throw new Error('Delegated follow-through closed before dispatch.');
}
