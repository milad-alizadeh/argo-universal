import {
  RequestError,
  type ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import type { AgentOptionsUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

type OptionsStream = AsyncIterator<AgentOptionsUpdate>;

async function nextUpdate(
  stream: OptionsStream,
  message: string,
): Promise<AgentOptionsUpdate> {
  const next = await stream.next();

  if (next.done) throw new Error(message);

  return next.value;
}

async function readUntil(
  stream: OptionsStream,
  matches: (update: AgentOptionsUpdate) => boolean,
  message: string,
): Promise<AgentOptionsUpdate> {
  while (true) {
    const update = await nextUpdate(stream, message);

    if (matches(update)) return update;
  }
}

async function closeStream(stream: OptionsStream): Promise<void> {
  await stream.return?.();
}

it.each([
  {
    failure: { code: -32603, message: 'Temporary discovery failure' },
    type: 'failed',
  },
  {
    failure: RequestError.authRequired().toErrorResponse(),
    type: 'auth-required',
  },
])(
  'recovers the same Session options stream after a $type discovery failure',
  async ({ failure, type }) => {
    const resumed = Promise.withResolvers<ResumeSessionRequest>();

    const host = await startAcpEngine({
      steps: [],
      responses: {
        'session/new': [
          { result: { sessionId: 'actual' } },
          { error: failure },
        ],
        'session/resume': [{ received: resumed }],
      },
    });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Keep this Session' }],
    });

    await host.caller.session.close(created);
    const reader = new AbortController();

    const stream = (
      await host.createCaller({ signal: reader.signal }).session.agentOptions({
        ...created,
        agent: emptySessionInput.agent,
        projectId: emptySessionInput.projectId,
      })
    )[Symbol.asyncIterator]();

    try {
      const failureUpdate = await readUntil(
        stream,
        (update) => 'error' in update,
        'Session reader ended before reporting discovery failure',
      );

      expect(failureUpdate).toMatchObject({
        error: { type },
        configOptions: [],
      });
      await host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Resume' }],
      });
      const request = await resumed.promise;
      await requireScriptedProcessAt(
        host.agent.processes,
        host.agent.processes.length - 1,
      ).play(
        [
          {
            type: 'update',
            update: {
              sessionUpdate: 'available_commands_update',
              availableCommands: [
                { name: 'after-resume', description: 'Resumed command' },
              ],
            },
          },
        ],
        request.sessionId,
      );

      const ready = await readUntil(
        stream,
        (update) => Boolean(update.commands?.length),
        'Session reader ended before commands arrived',
      );

      expect(ready).toMatchObject({
        commands: [{ name: 'after-resume', description: 'Resumed command' }],
      });
      expect(ready).not.toHaveProperty('error');
    } finally {
      reader.abort();
      await closeStream(stream);
    }
  },
);
