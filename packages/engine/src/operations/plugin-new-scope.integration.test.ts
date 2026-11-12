import { PluginNewOutput } from '@repo/contracts/operations/plugin-guide';
import { afterEach, expect, it } from 'vitest';
import { delegationJourney } from '#mocks/session-delegation';

type Journey = Awaited<ReturnType<typeof delegationJourney>>;

let journey: Journey | undefined;

afterEach(async () => {
  await journey?.host.stop();
  journey = undefined;
});

it('writes into the calling Session’s Checkout when a Session runs it with no sessionId', async () => {
  journey = await delegationJourney();

  const response = await journey.caller.caller.operations.run.mutate({
    id: 'plugin.new',
    params: { id: 'from-an-agent' },
  });

  expect(response).toMatchObject({ kind: 'result' });
  expect(
    PluginNewOutput.parse(response.kind === 'result' ? response.result : null),
  ).toMatchObject({ path: 'plugins/from-an-agent' });
}, 60_000);
