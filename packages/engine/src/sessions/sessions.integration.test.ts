import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';
import { sessionSources } from '#mocks/session-sources';
import { userOrigin } from './prompt-sender';
import { Sessions } from './sessions';

const prompt = [{ type: 'text' as const, text: 'Once more' }];

const stopping = expect.objectContaining({
  code: 'CONFLICT',
  message: 'The Engine is stopping',
});

it('refuses a Session command once the Engine stops admitting them', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host);

  const sessions = new Sessions(
    sessionSources(host.openSessions, AbortSignal.abort()),
  );

  await expect(
    sessions.implementations['session.cancel']({ sessionId }),
  ).rejects.toEqual(stopping);
});

it('refuses a Prompt whose caller stopped waiting, while the Engine still admits other commands', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host);
  const sessions = new Sessions(sessionSources(host.openSessions));

  const start = sessions.prompt(
    { sessionId, prompt },
    { ...userOrigin, signal: AbortSignal.abort() },
  );

  await expect(start.accepted).rejects.toEqual(stopping);
  await expect(
    sessions.implementations['session.rename']({ sessionId, title: 'Kept' }),
  ).resolves.toEqual({});
});

it('reads an idle open Session as idle, and opens a closed one before its next Prompt', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host);
  const sessions = new Sessions(sessionSources(host.openSessions));

  await expect(
    sessions.implementations['session.get']({ sessionId }),
  ).resolves.toMatchObject({ state: 'idle' });
  await sessions.implementations['session.close']({ sessionId });
  await expect(
    sessions.prompt({ sessionId, prompt }, userOrigin).accepted,
  ).resolves.toMatchObject({ turnId: expect.any(String) });
});
