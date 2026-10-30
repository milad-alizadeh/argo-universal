import { RequestError } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { startSessionJourney, newSession } from '#mocks/session-journey';

it('removes a closed Session and resumes its stored Agent identity on the next prompt', async (): Promise<void> => {
  const { caller, openings, resumes, prompts } = await startSessionJourney();
  const { sessionId } = await caller.session.new(newSession);
  const opening = openings[0];

  if (!opening) throw new Error('No opened Agent Session');
  await expect.poll(() => prompts).toHaveLength(1);
  await caller.session.close({ sessionId });
  await caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Continue' }],
  });
  expect(openings).toHaveLength(1);
  expect(resumes).toEqual([
    {
      sessionId: 'owned-1',
      cwd: opening.cwd,
      mcpServers: [expect.objectContaining({ name: 'argo', args: ['mcp'] })],
    },
  ]);
  await expect
    .poll(() => prompts)
    .toEqual([
      { sessionId: 'owned-1', prompt: newSession.prompt },
      { sessionId: 'owned-1', prompt: [{ type: 'text', text: 'Continue' }] },
    ]);
});

it('opens a stored Session without a Turn, so a Retry never resends one', async (): Promise<void> => {
  const { caller, openings, resumes, prompts } = await startSessionJourney();
  const { sessionId } = await caller.session.new(newSession);
  const opening = openings[0];

  if (!opening) throw new Error('No opened Agent Session');
  await expect.poll(() => prompts).toHaveLength(1);
  await caller.session.close({ sessionId });
  await expect(caller.session.open({ sessionId })).resolves.toEqual({});
  expect(resumes).toEqual([
    {
      sessionId: 'owned-1',
      cwd: opening.cwd,
      mcpServers: [expect.objectContaining({ name: 'argo', args: ['mcp'] })],
    },
  ]);
  expect(prompts).toHaveLength(1);
});

it('refuses to open a past Session whose Agent needs sign-in with a typed auth-required error', async (): Promise<void> => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [{ error: RequestError.authRequired().toErrorResponse() }],
    },
  });

  await expect(
    host.caller.session.open({ sessionId: 'session-1' }),
  ).rejects.toMatchObject({ cause: { openError: { type: 'auth-required' } } });
});
