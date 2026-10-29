import { startingRank, type SessionConfigOption } from '@repo/contracts';
import { configureAcp } from './acp-configuration-operation';
import { validateConfigChoice } from './session-admission';
import type { SessionContext } from './session-context';

// Resume can return Agent defaults. Reapply the Session's durable choices before admitting a Turn.
export const restoreAcpConfiguration = async (
  context: SessionContext,
  signal: AbortSignal,
): Promise<SessionConfigOption[]> => {
  let options = context.configOptions;
  const pending = [...context.configValues];

  while (pending.length > 0) {
    signal.throwIfAborted();
    const choice = nextChoice(pending, options);

    if (choice) options = await restoreConfigChoice(context, options, choice);
  }

  signal.throwIfAborted();

  return options;
};

type Choice = SessionContext['configValues'][number];

function nextChoice(
  pending: Choice[],
  options: SessionConfigOption[],
): Choice | undefined {
  pending.sort(
    (left, right) =>
      configurationRank(options, left.configId) -
      configurationRank(options, right.configId),
  );

  return pending.shift();
}

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
  choice: Choice,
): Promise<SessionConfigOption[]> {
  validateConfigChoice(options, choice);

  if (hasChoice(options, choice)) return options;

  const restored = await configureAcp({
    ...context,
    configOptions: options,
    applyingConfig: { type: 'session.setConfigOption', ...choice },
  });

  requireRestored(restored, choice);

  return restored;
}

const hasChoice = (options: SessionConfigOption[], choice: Choice): boolean =>
  options.find((option) => option.configId === choice.configId)
    ?.currentValue === choice.value;

function requireRestored(options: SessionConfigOption[], choice: Choice): void {
  if (!hasChoice(options, choice))
    throw new Error(
      `The Agent did not restore ${choice.configId}=${String(choice.value)}`,
    );
}
