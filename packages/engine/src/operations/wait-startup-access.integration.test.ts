import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { emptySessionInput } from '#mocks/acp-engine';
import { operationCaller } from '#mocks/operations';
import { openingWaitHost } from '#mocks/operation-opening';

it('refuses Session-token calls before the new Session can store Tool rows, then admits them after opening', async () => {
  const host = await openingWaitHost();
  const { opening, release, environment, user } = host;
  const started = OperationExecution.parse(await user.operations.run.mutate({ id: 'session.new', params: { ...emptySessionInput, prompt: [{ type: 'text', text: 'Open before access' }] } }));
  await opening;
  const caller = await operationCaller(host, z.string().parse((await environment).ARGO_TOKEN));
  const outcome = await caller.operations.list.query().then(() => ({ message: 'accepted' }), (error) => z.object({ message: z.string(), data: z.object({ code: z.string() }) }).parse(error));
  expect(outcome).toMatchObject({ message: 'The calling Session is still opening', data: { code: 'CONFLICT' } });
  release.resolve();
  expect(await user.operations.wait.mutate({ id: started.id })).toMatchObject({ status: 'settled', turn: { stopReason: 'end_turn' } });
  expect(await caller.operations.list.query()).toEqual(expect.any(Array));
}, 30_000);
