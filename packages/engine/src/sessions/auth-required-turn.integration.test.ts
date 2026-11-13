import {
  type PromptRequest,
  RequestError,
  type ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import type { SessionPromptInput } from '@repo/contracts';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { withoutSessionAccess } from '#mocks/session-access';

const prompt = (text: string): SessionPromptInput['prompt'] => [
  { type: 'text', text },
];

const refusedThenAnswered = (
  prompts: PromptRequest[],
  resumes: ResumeSessionRequest[],
): ScriptedScenario => ({
  steps: [],
  responses: {
    'session/resume': [{ requests: resumes }],
    'session/prompt': [
      { error: RequestError.authRequired(), requests: prompts },
      { result: { stopReason: 'end_turn' }, requests: prompts },
    ],
  },
});

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

// Sends a prompt the Agent refuses with `auth_required`, then resends, and answers how many processes the resend started.
const startedByResend = async (
  host: Host,
  prompts: PromptRequest[],
): Promise<number> => {
  await host.caller.session.prompt({
    sessionId: 'session-1',
    prompt: prompt('Refused'),
  });
  await waitForAcpSessionIdle(host, 'session-1');
  const before = host.agent.processes.length;

  await host.caller.session.prompt({
    sessionId: 'session-1',
    prompt: prompt('Resent'),
  });
  await expect.poll(() => prompts).toHaveLength(2);

  return host.agent.processes.length - before;
};

/*
 * An Agent process can hold a sign-in the Agent has since revoked, and answer `authenticate` as signed in (#2031).
 * The Turn that ended `auth_required` ends that process, so the resend reads the sign-in again.
 */
it("resends on a new Agent process after a Turn ended auth_required on the Session's own", async () => {
  const prompts: PromptRequest[] = [];
  const resumes: ResumeSessionRequest[] = [];
  const host = await startAcpEngine(refusedThenAnswered(prompts, resumes));

  expect(await startedByResend(host, prompts)).toBe(1);
  expect(resumes.at(-1)).toMatchObject({ sessionId: prompts[0]?.sessionId });
});

it('keeps a shared Agent process after a Turn ended auth_required, as other Sessions run on it', async () => {
  const prompts: PromptRequest[] = [];

  const host = await startAcpEngine({
    ...refusedThenAnswered(prompts, []),
    sessionAccess: withoutSessionAccess,
  });

  expect(await startedByResend(host, prompts)).toBe(0);
});
