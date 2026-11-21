import type {
  PromptRequest,
  ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';
import { closeTestSession } from '#mocks/close-session';
import { lastNoticeTitle, startIdleSession } from '#mocks/session-restart';

it('reload resumes the same Agent session on a new Agent process and leaves a Notice', async () => {
  const resumes: ResumeSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/resume': [{ requests: resumes }] },
  });

  const session = await startIdleSession(host);

  await expect(host.caller.session.reload(session)).resolves.toEqual({});
  expect({
    resumed: resumes.map(({ sessionId }) => sessionId),
    processes: host.agent.processes.length,
    notice: await lastNoticeTitle(host, session.sessionId),
  }).toEqual({
    resumed: ['owned-1'],
    processes: 2,
    notice: 'Agent reloaded',
  });
});

it('refuses a reload while a Turn runs and leaves the Turn running', async () => {
  const received = Promise.withResolvers<PromptRequest>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [{ received, steps: [{ type: 'hold' }] }],
    },
  });

  const session = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Start' }],
  });

  await received.promise;
  await expect(host.caller.session.reload(session)).rejects.toThrow(
    'A Turn is running. Stop it, then try again.',
  );
  expect({
    state: (await host.caller.session.get(session)).state,
    processes: host.agent.processes.length,
  }).toEqual({ state: 'running', processes: 1 });
});

it('refuses to reload a Session no prompt reached', async () => {
  const host = await startAcpEngine({ steps: [] });
  const session = await host.caller.session.new(emptySessionInput);

  await expect(host.caller.session.reload(session)).rejects.toThrow(
    'Session cannot accept session.restart',
  );
});

it('refuses to reload an archived Session', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host, { type: 'main' });
  await closeTestSession(host, { sessionId });
  await host.caller.session.archive({ sessionId });

  await expect(host.caller.session.reload({ sessionId })).rejects.toMatchObject(
    { code: 'CONFLICT' },
  );
});
