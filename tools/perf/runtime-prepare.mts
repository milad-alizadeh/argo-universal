import type { SessionConfigOption } from '@repo/contracts';
import { readRuntimeSession } from './runtime-client.mts';
import type { RuntimeContext } from './runtime-context.mts';

function sameChoices(
  before: SessionConfigOption[],
  after: SessionConfigOption[],
): boolean {
  return before.every((choice) =>
    after.some(
      (actual) =>
        actual.configId === choice.configId &&
        actual.currentValue === choice.currentValue,
    ),
  );
}

async function openRuntime(context: RuntimeContext): Promise<void> {
  const { client, target, workload } = context;

  if (workload.reopen)
    await client.mutation('operations.run', {
      id: 'session.close',
      params: { sessionId: target.sessionId },
      wait: true,
    });
  await client.mutation('session.open', { sessionId: target.sessionId });
}

export async function prepareRuntime(context: RuntimeContext): Promise<void> {
  const { client, target, record } = context;
  const before = await readRuntimeSession(client, target.sessionId);
  record.result.choices.beforeOpen = before.configOptions;

  if (before.activeTurnId !== null)
    throw new Error('Runtime timing requires an idle isolated Session');
  await openRuntime(context);
  const after = await readRuntimeSession(client, target.sessionId);
  record.result.choices.afterOpen = after.configOptions;

  if (!sameChoices(before.configOptions, after.configOptions))
    throw new Error('Session choices changed while opening; trial refused');
}
