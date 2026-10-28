import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { openingWaitHost } from '#mocks/operation-opening';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

it('closes the native Session returned before storage and retires its private process', async () => {
  const host = await openingWaitHost();
  const { opening, release, user } = host;
  const started = OperationExecution.parse(await user.operations.run.mutate({ id: 'session.new', params: { ...emptySessionInput, prompt: [{ type: 'text', text: 'Never admitted before close' }] } }));
  const created = SessionNewOutput.parse(started.result);
  await opening;
  expect(await host.caller.session.close(created)).toEqual({});
  await expect(user.operations.wait.mutate({ id: started.id })).rejects.toMatchObject({ data: { code: 'NOT_FOUND' } });
  expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(1);
  release.resolve();
  expect((await host.caller.session.list({})).sessions).not.toContainEqual(expect.objectContaining(created));
}, 30_000);
