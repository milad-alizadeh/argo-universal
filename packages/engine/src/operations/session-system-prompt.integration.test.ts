import { argoInstructionsMarkdown } from '@repo/contracts/agents/argo-instructions';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import {
  requireScriptedProcessAt,
  type ScriptedProcess,
} from '#mocks/scripted-agent';

const newSession = 'session/new';

const takesSystemPrompt = {
  protocolVersion: 1,
  agentCapabilities: {
    loadSession: true,
    sessionCapabilities: { close: {}, resume: {}, systemPrompt: {} },
  },
};

const argoSystemPrompt = {
  mode: 'append',
  content: [{ type: 'text', text: argoInstructionsMarkdown() }],
};

const SystemPrompt = z.object({
  mode: z.string(),
  content: z.array(z.object({ type: z.string(), text: z.string() })),
});

const SentOpening = z.object({
  method: z.string(),
  params: z.object({ systemPrompt: SystemPrompt.optional() }),
});

// The scripted Agent parses with an SDK that drops `systemPrompt`, so read the request as it crossed the wire.
async function sentSystemPrompt(
  process: ScriptedProcess,
  method: string,
): Promise<z.infer<typeof SystemPrompt> | undefined> {
  const sent = SentOpening.safeParse(await process.receive());

  if (sent.success && sent.data.method === method)
    return sent.data.params.systemPrompt;

  return sentSystemPrompt(process, method);
}

const startHost = (
  initialization?: typeof takesSystemPrompt,
): ReturnType<typeof startAcpEngine> =>
  startAcpEngine({
    steps: [],
    responses: initialization
      ? { initialize: [{ result: initialization }] }
      : {},
  });

const firstProcess = (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
): ScriptedProcess => requireScriptedProcessAt(host.agent.processes);

it('appends the Argo instructions to the system prompt of an Agent that takes one', async () => {
  const host = await startHost(takesSystemPrompt);
  const created = await host.caller.session.new(emptySessionInput);

  await expect(
    sentSystemPrompt(firstProcess(host), newSession),
  ).resolves.toEqual(argoSystemPrompt);

  await host.caller.session.close(created);
}, 30_000);

it('sends no system prompt to an Agent that does not take one', async () => {
  const host = await startHost();
  const created = await host.caller.session.new(emptySessionInput);

  await expect(
    sentSystemPrompt(firstProcess(host), newSession),
  ).resolves.toBeUndefined();

  await host.caller.session.close(created);
}, 30_000);

it('sends no system prompt when Agent access is disabled', async () => {
  const host = await startHost(takesSystemPrompt);

  await host.caller.agent.setAccess({ enabled: false });

  const created = await host.caller.session.new(emptySessionInput);

  await expect(
    sentSystemPrompt(firstProcess(host), newSession),
  ).resolves.toBeUndefined();

  await host.caller.session.close(created);
}, 30_000);

it('leaves the Todo list out of the system prompt when the person turned the Todo list off', async () => {
  const host = await startHost(takesSystemPrompt);

  await host.caller.agent.setTodoList({ enabled: false });

  const created = await host.caller.session.new(emptySessionInput);

  await expect(
    sentSystemPrompt(firstProcess(host), newSession),
  ).resolves.toEqual({
    mode: 'append',
    content: [
      { type: 'text', text: argoInstructionsMarkdown({ todoList: false }) },
    ],
  });

  await host.caller.session.close(created);
}, 30_000);

it('appends the Argo instructions again when a Session resumes on a new process', async () => {
  const host = await startHost(takesSystemPrompt);

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);

  const events = await host.caller.feed.subscribe({ ...created, after: null });

  firstProcess(host).exited.resolve();

  for await (const event of events) if (event.type === 'closed') break;
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Again' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);

  await expect(
    sentSystemPrompt(
      requireScriptedProcessAt(host.agent.processes, 1),
      'session/resume',
    ),
  ).resolves.toEqual(argoSystemPrompt);
}, 30_000);
