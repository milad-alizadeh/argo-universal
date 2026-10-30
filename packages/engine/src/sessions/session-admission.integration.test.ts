import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { pauseArchiveWrite, promptedArchiveSession } from '#mocks/archive';
import { insertSession } from '#mocks/database';
import { sessionSources } from '#mocks/session-sources';
import { userOrigin } from './prompt-sender';
import { Sessions } from './sessions';

const prompt = [{ type: 'text' as const, text: 'Admit me' }];

const conflict = expect.objectContaining({ code: 'CONFLICT' });

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const openSessions = (host: Host): Sessions =>
  new Sessions(sessionSources(host.openSessions));

// A scripted ACP answer that holds until the test opens it.
type Gate = {
  entered: PromiseWithResolvers<void>;
  open: PromiseWithResolvers<void>;
};

const gate = (): Gate => ({
  entered: Promise.withResolvers<void>(),
  open: Promise.withResolvers<void>(),
});

const isPending = async (promise: Promise<unknown>): Promise<boolean> =>
  Promise.race([
    promise.then(
      () => false,
      () => false,
    ),
    Promise.resolve(true),
  ]);

// A Session whose archive write the Writer keeps retrying, so the Session stays archiving.
async function archivingSession(): Promise<{ host: Host; sessionId: string }> {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host);
  const rejected = pauseArchiveWrite(host.database, 'IS NOT NULL');
  onTestFinished(() => {
    host.database.$client.exec('DROP TRIGGER IF EXISTS pause_archive');
  });
  void host.caller.session.archive({ sessionId }).catch(() => {});
  await rejected;

  return { host, sessionId };
}

it('refuses a Prompt for an archived Session', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host);
  const sessions = openSessions(host);
  await sessions.implementations['session.archive']({ sessionId });

  await expect(
    sessions.prompt({ sessionId, prompt }, userOrigin).accepted,
  ).rejects.toEqual(conflict);
});

it('refuses a command for a Subagent', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host);
  insertSession(host.database, { id: 'child', parentSessionId: sessionId });

  await expect(
    openSessions(host).implementations['session.cancel']({
      sessionId: 'child',
    }),
  ).rejects.toEqual(conflict);
});

it('waits for a starting Session before admitting its Prompt', async () => {
  const opening = gate();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/resume': [
        {
          steps: [
            {
              type: 'gate',
              waitFor: opening.open.promise,
              entered: opening.entered,
            },
          ],
        },
      ],
    },
  });

  const { sessionId } = await promptedArchiveSession(host);
  const sessions = openSessions(host);
  await sessions.implementations['session.close']({ sessionId });
  const start = sessions.prompt({ sessionId, prompt }, userOrigin);
  await opening.entered.promise;

  await expect(isPending(start.accepted)).resolves.toBe(true);
  opening.open.resolve();
  await expect(start.accepted).resolves.toMatchObject({ turnId: start.turnId });
});

it('waits for a settling Session before admitting its Prompt', async () => {
  const turn = gate();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          steps: [
            { type: 'gate', waitFor: turn.open.promise, entered: turn.entered },
          ],
        },
      ],
    },
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({ sessionId, prompt });
  await turn.entered.promise;
  const sessions = openSessions(host);
  await sessions.implementations['session.cancel']({ sessionId });
  const start = sessions.prompt({ sessionId, prompt }, userOrigin);

  await expect(isPending(start.accepted)).resolves.toBe(true);
  turn.open.resolve();
  await expect(start.accepted).resolves.toMatchObject({ turnId: start.turnId });
});

it('admits a command while the Session archives', async () => {
  const { host, sessionId } = await archivingSession();

  await expect(host.caller.session.open({ sessionId })).resolves.toEqual({});
});

it('refuses to close a Session while it archives', async () => {
  const { host, sessionId } = await archivingSession();

  await expect(
    openSessions(host).implementations['session.close']({ sessionId }),
  ).rejects.toEqual(conflict);
});
