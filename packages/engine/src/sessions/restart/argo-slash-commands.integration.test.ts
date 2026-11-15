import type {
  PromptRequest,
  ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import type { AgentOptionsUpdate } from '@repo/contracts';
import { slashCommandsUpdate } from '@repo/mocks/agent/slash-commands-update';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { lastNoticeTitle, startIdleSession } from '#mocks/session-restart';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const owner = {
  agent: emptySessionInput.agent,
  projectId: emptySessionInput.projectId,
};

const reportsCommand = (update: AgentOptionsUpdate, name: string): boolean =>
  update.commands?.some((command) => command.name === name) ?? false;

// Waits until the Session's reader is told the Agent reports the command.
async function reported(
  host: Host,
  input: { sessionId: string },
  name: string,
): Promise<void> {
  const reader = new AbortController();

  const stream = await host
    .createCaller({ signal: reader.signal })
    .session.agentOptions({ ...owner, ...input });

  for await (const update of stream)
    if (reportsCommand(update, name)) return reader.abort();
}

const reports = (
  host: Host,
  names: readonly string[],
  agentSessionId: string,
): Promise<void> =>
  requireScriptedProcessAt(host.agent.processes).play(
    [slashCommandsUpdate(names.map((name) => ({ name, description: name })))],
    agentSessionId,
  );

async function submit(
  host: Host,
  session: { sessionId: string },
  text: string,
): Promise<void> {
  await host.caller.session.submit({
    ...session,
    prompt: [{ type: 'text', text }],
  });
}

it('runs a submitted /reload on the Session and sends the Agent no prompt', async () => {
  const prompts: PromptRequest[] = [];
  const resumes: ResumeSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [{ requests: prompts }],
      'session/resume': [{ requests: resumes }],
    },
  });

  const session = await startIdleSession(host);

  await submit(host, session, ' /reload\n');
  expect({
    prompts: prompts.length,
    resumes: resumes.length,
    notice: await lastNoticeTitle(host, session.sessionId),
  }).toEqual({ prompts: 1, resumes: 1, notice: 'Agent reloaded' });
});

it('runs a submitted /clear on the Session', async () => {
  const host = await startAcpEngine({ steps: [] });
  const session = await startIdleSession(host);

  await submit(host, session, '/clear');
  expect(await lastNoticeTitle(host, session.sessionId)).toBe(
    'Context cleared',
  );
});

it('sends /clear with arguments to the Agent as an ordinary prompt', async () => {
  const prompts: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [{ requests: prompts }] },
  });

  const session = await startIdleSession(host);

  await submit(host, session, '/clear now');
  await expect.poll(() => prompts.length).toBe(2);
  await waitForAcpSessionIdle(host, session.sessionId);
  expect(prompts[1]?.prompt).toEqual([{ type: 'text', text: '/clear now' }]);
});

it('sends /clear to an Agent that reports its own', async () => {
  const prompts: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [{ requests: prompts }] },
  });

  const session = await startIdleSession(host);
  await reports(host, ['clear'], 'owned-1');
  await reported(host, session, 'clear');

  await submit(host, session, '/clear');
  await expect.poll(() => prompts.length).toBe(2);
  await waitForAcpSessionIdle(host, session.sessionId);
  expect(prompts[1]?.prompt).toEqual([{ type: 'text', text: '/clear' }]);
});
