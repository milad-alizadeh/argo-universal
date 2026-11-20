import type {
  NewSessionRequest,
  PromptRequest,
  ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { closeTestSession } from '#mocks/close-session';
import { lastNoticeTitle, startIdleSession } from '#mocks/session-restart';

it('clear opens a new Agent session for the same Session and leaves a Notice', async () => {
  const openings: NewSessionRequest[] = [];
  const resumes: ResumeSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [{ requests: openings }],
      'session/resume': [{ requests: resumes }],
    },
  });

  const session = await startIdleSession(host);

  await expect(host.caller.session.clear(session)).resolves.toEqual({});
  expect({
    opened: openings.length,
    sameCheckout: openings[0]?.cwd === openings[1]?.cwd,
    resumed: resumes.length,
    notice: await lastNoticeTitle(host, session.sessionId),
  }).toEqual({
    opened: 2,
    sameCheckout: true,
    resumed: 0,
    notice: 'Context cleared',
  });
});

it('sends the prompt after a clear to the new Agent session, and keeps the Feed above it', async () => {
  const prompts: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [{ requests: prompts }] },
  });

  const session = await startIdleSession(host);
  await host.caller.session.clear(session);
  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'Again' }],
  });
  await waitForAcpSessionIdle(host, session.sessionId);

  const { rows } = await host.caller.feed.page({
    ...session,
    direction: 'tail',
  });

  expect({
    agentSessions: prompts.map(({ sessionId }) => sessionId),
    userMessages: rows.filter((row) => row.sessionUpdate === 'user_message')
      .length,
  }).toEqual({ agentSessions: ['owned-1', 'owned-2'], userMessages: 2 });
});

it('resumes the new Agent session, not the cleared one, when the Session is closed and prompted again', async () => {
  const resumes: ResumeSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/resume': [{ requests: resumes }] },
  });

  const session = await startIdleSession(host);
  await host.caller.session.clear(session);
  await closeTestSession(host, session);
  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'Again' }],
  });

  expect(resumes.map(({ sessionId }) => sessionId)).toEqual(['owned-2']);
});
