import {
  RequestError,
  type ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

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
      let failureUpdate;

      while (true) {
        const next = await stream.next();

        if (next.done)
          throw new Error(
            'Session reader ended before reporting discovery failure',
          );

        if ('error' in next.value) {
          failureUpdate = next.value;
          break;
        }
      }

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
      let ready;

      while (true) {
        const next = await stream.next();

        if (next.done)
          throw new Error('Session reader ended before commands arrived');

        if (next.value.commands?.length) {
          ready = next.value;
          break;
        }
      }

      expect(ready).toMatchObject({
        commands: [{ name: 'after-resume', description: 'Resumed command' }],
      });
      expect(ready).not.toHaveProperty('error');
    } finally {
      reader.abort();
      await stream.return?.();
    }
  },
);
