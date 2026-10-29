import type { SessionNewInput, PromptSender } from '@repo/contracts';
import type { CoreHooks } from '@repo/contracts/plugins';
import { isOfferedConfigChoice } from '../admission/config-admission';
import type { SessionRouterDeps } from '../router-deps';
import { submitSessionPrompt } from '../session-command';
import { applySessionConfig } from '../session-configuration';
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

type ConfigChoice = SessionNewInput['configOptions'][number];

const skipChoice = (session: SessionActorRef, choice: ConfigChoice): boolean =>
  Boolean(
    choice.optional &&
    !isOfferedConfigChoice(session.getSnapshot().context.configOptions, choice),
  );

const choiceCommand = (
  session: SessionActorRef,
  choice: ConfigChoice,
): Parameters<typeof applySessionConfig>[1] => ({
  sessionId: session.getSnapshot().context.sessionId,
  configId: choice.configId,
  ...(typeof choice.value === 'boolean'
    ? { type: 'boolean', value: choice.value }
    : { type: 'id', value: choice.value }),
});

async function applyChoices(
  session: SessionActorRef,
  choices: ConfigChoice[],
): Promise<void> {
  for (const choice of choices) {
    if (skipChoice(session, choice)) continue;

    await applySessionConfig(session, choiceCommand(session, choice));
  }
}

// Once stored, the Session applies its first choices, then submits its first prompt.
export async function startSession(
  deps: Pick<SessionRouterDeps, 'hooks'>,
  session: SessionActorRef,
  { input, sender }: { input: SessionNewInput; sender: PromptSender },
): Promise<string | undefined> {
  await applyInitialConfiguration(session, input);

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

const applyInitialConfiguration = async (
  session: SessionActorRef,
  input: SessionNewInput,
): Promise<void> => {
  if (!session.getSnapshot().context.acpLease) return;

  await applyChoices(session, input.configOptions);
};
