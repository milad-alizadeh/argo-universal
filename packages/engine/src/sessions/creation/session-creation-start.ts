import type { SessionNewInput, PromptSender } from '@repo/contracts';
import type { CoreHooks } from '@repo/contracts/plugins';
import { applyInitialConfiguration } from '../configuration';
import type { SessionRouterDeps } from '../router-deps';
import { submitSessionPrompt } from '../session-command';
import type { SessionContext } from '../session-context';
import type { NewSessionInput } from '../session-data';
import type { SessionActorRef } from '../session-machine';

type PromptReady = SessionContext & { input: NewSessionInput };

const hasInitialPrompt = (context: SessionContext): context is PromptReady =>
  Boolean(
    context.acpLease &&
    context.input.kind === 'new' &&
    context.input.prompt.length > 0,
  );

const initialPromptHook = (
  hooks: CoreHooks,
  context: PromptReady,
): ReturnType<CoreHooks['prompt.submit']> =>
  hooks['prompt.submit']({
    sessionId: context.sessionId,
    projectId: context.input.projectId,
    prompt: context.input.prompt,
  });

async function submitInitialTurn(
  session: SessionActorRef,
  prompt: Parameters<typeof submitSessionPrompt>[1],
): Promise<string> {
  await submitSessionPrompt(session, prompt);

  return prompt.turnId;
}

// Once stored, the Session applies its first choices, then submits its first prompt.
export async function startSession(
  deps: Pick<SessionRouterDeps, 'hooks'>,
  session: SessionActorRef,
  { input, sender }: { input: SessionNewInput; sender: PromptSender },
): Promise<string | undefined> {
  await applyFirstChoices(session, input);

  return submitInitialAcpPrompt(session, deps.hooks, sender);
}

// The first prompt passes `prompt.submit` Hooks like any other; a dropped one leaves the Session waiting.
const submitInitialAcpPrompt = async (
  session: SessionActorRef,
  hooks: CoreHooks,
  sender: PromptSender,
): Promise<string | undefined> => {
  const context = session.getSnapshot().context;

  if (!hasInitialPrompt(context)) return;

  const answer = await initialPromptHook(hooks, context);

  if ('drop' in answer) return;

  return submitInitialTurn(session, {
    turnId: context.input.turnId,
    content: answer.prompt,
    sender,
  });
};

const applyFirstChoices = async (
  session: SessionActorRef,
  input: SessionNewInput,
): Promise<void> => {
  if (!session.getSnapshot().context.acpLease) return;

  await applyInitialConfiguration(session, input.configOptions);
};
