import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';
import { sessionSources } from '#mocks/session-sources';
import { userOrigin } from './prompt-sender';
import { Sessions } from './sessions';

const prompt = [{ type: 'text' as const, text: 'Once more' }];

const stopping = expect.objectContaining({
  code: 'CONFLICT',
  message: 'The Engine is stopping',
});

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const openSessions = (host: Host): Sessions =>
  new Sessions(sessionSources(host.openSessions));

const stoppingSessions = (host: Host): Sessions =>
  new Sessions(sessionSources(host.openSessions, AbortSignal.abort()));

async function runningSession(): Promise<{ host: Host; sessionId: string }> {
  const received = Promise.withResolvers<PromptRequest>();

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [{ received, steps: [{ type: 'hold' }] }] },
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({ sessionId, prompt });
  await received.promise;

  return { host, sessionId };
}

it('refuses a Session command once the Engine stops admitting them', async () => {
  const { host, sessionId } = await runningSession();

  await expect(
    stoppingSessions(host).implementations['session.cancel']({ sessionId }),
  ).rejects.toEqual(stopping);
});

it('sends nothing to a Session when the Engine refuses its command', async () => {
  const { host, sessionId } = await runningSession();
  const sessions = stoppingSessions(host);

  await sessions.implementations['session.cancel']({ sessionId }).catch(
    () => {},
  );

  await expect(
    sessions.implementations['session.get']({ sessionId }),
  ).resolves.toMatchObject({ state: 'running' });
});

it('refuses a Prompt whose caller stopped waiting', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host);

  const start = openSessions(host).prompt(
    { sessionId, prompt },
    { ...userOrigin, signal: AbortSignal.abort() },
  );

  await expect(start.accepted).rejects.toEqual(stopping);
});

it('admits other commands after a Prompt caller stops waiting', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host);
  const sessions = openSessions(host);

  const start = sessions.prompt(
    { sessionId, prompt },
    { ...userOrigin, signal: AbortSignal.abort() },
  );

  await start.accepted.catch(() => {});

  await expect(
    sessions.implementations['session.rename']({ sessionId, title: 'Kept' }),
  ).resolves.toEqual({});
});

it('reads an idle open Session as idle', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host);

  await expect(
    openSessions(host).implementations['session.get']({ sessionId }),
  ).resolves.toMatchObject({ state: 'idle' });
});

it('opens a closed Session before its next Prompt', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host);
  const sessions = openSessions(host);
  await sessions.implementations['session.close']({ sessionId });

  await expect(
    sessions.prompt({ sessionId, prompt }, userOrigin).accepted,
  ).resolves.toMatchObject({ turnId: expect.any(String) });
});
