import type {
  NewSessionRequest,
  TerminalOutputResponse,
} from '@agentclientprotocol/sdk';
import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { operationCaller, runOperation } from '#mocks/operations';
import { openAccessSession, sessionIdentityStep } from '#mocks/session-access';

const notFound = { data: { code: 'NOT_FOUND' } };

// Owner, 2026-10-28: only session.close acts on a Session that is still opening.
it('refuses cancel, rename and Shell stop on a still-opening Session for every caller', async () => {
  const { host, caller, sessionId, release } = await openingDelegation();
  const user = await operationCaller(host);
  const cancel = { sessionId };
  const rename = { sessionId, title: 'Renamed' };
  const stop = { sessionId, shellId: 'no-shell' };

  for (const token of [caller, user]) {
    await expect(
      runOperation(token.operations, { id: 'session.cancel', params: cancel }),
    ).rejects.toMatchObject(notFound);
    await expect(
      runOperation(token.operations, { id: 'session.rename', params: rename }),
    ).rejects.toMatchObject(notFound);
    await expect(
      runOperation(token.operations, { id: 'shell.stop', params: stop }),
    ).rejects.toMatchObject(notFound);
  }

  await expect(host.caller.session.cancel(cancel)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  });
  await expect(host.caller.session.rename(rename)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  });
  await expect(host.caller.shell.stop(stop)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  });
  release.resolve();
}, 30_000);

it('closes a still-opening Session', async () => {
  const { host, sessionId, release } = await openingDelegation();

  expect(await host.caller.session.close({ sessionId })).toEqual({});
  release.resolve();
}, 30_000);

// The calling Session opens at once; the Session it starts stays opening until released.
async function openingDelegation(): Promise<OpeningDelegation> {
  const outputs: TerminalOutputResponse[] = [];
  const opening = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();
  onTestFinished(() => release.resolve());

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [{}, { received: opening, waitFor: release.promise }],
      'session/prompt': [{ steps: [sessionIdentityStep(outputs)] }],
    },
  });

  const session = await openAccessSession({ host, outputs }, 'Caller');

  const started = OperationExecution.parse(
    await runOperation(session.caller.operations, {
      id: 'session.new',
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'Delegated work' }],
      },
    }),
  );

  await opening.promise;
  const { sessionId } = SessionNewOutput.parse(started.result);

  return { host, caller: session.caller, sessionId, release };
}

type OpeningDelegation = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  caller: Awaited<ReturnType<typeof operationCaller>>;
  sessionId: string;
  release: PromiseWithResolvers<void>;
};
