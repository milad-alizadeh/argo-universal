import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { describe, expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  build,
  calling,
  spoken,
  startCall,
  startSession,
  withAccess,
} from '#mocks/voice-started';

const question = 'Which lights should the dashboard control?';

const reviewing = 'Review the change';

const elicitation: ScriptedStep = {
  type: 'elicitation',
  request: {
    mode: 'form',
    message: question,
    requestedSchema: {
      type: 'object',
      properties: { answer: { type: 'string', title: 'Answer' } },
    },
  },
};

const message = (text: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'agent_message_chunk',
    messageId: `message-${text.length}`,
    content: { type: 'text', text },
  },
});

const subagent = (state: 'running' | 'idle'): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'subagent_update',
    sessionId: 'reviewer-1',
    title: reviewing,
    state: { state },
  },
});

const timing = { timeout: 30000 };

describe(
  'a Voice call watches the Sessions its Session started',
  timing,
  () => {
    it('says when a Started Session asks the person a question', async () => {
      const call = await calling([{ prompt: build, steps: [elicitation] }]);

      startSession(call);

      await expect
        .poll(spoken(call), { timeout: 10000 })
        .toContainEqual(expect.stringContaining(question));
    });

    it('says when a Started Session waits for permission', async () => {
      const call = await calling([
        {
          prompt: build,
          steps: [
            {
              type: 'permission',
              request: {
                toolCall: { toolCallId: 'deploy', title: 'Run npm run deploy' },
                options: [
                  { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
                ],
              },
            },
          ],
        },
      ]);

      startSession(call);

      await expect
        .poll(spoken(call), { timeout: 10000 })
        .toContainEqual(
          expect.stringMatching(/permission: Run npm run deploy/),
        );
    });

    it('says so of a Started Session already waiting when the call starts', async () => {
      const call = await withAccess([{ prompt: build, steps: [elicitation] }]);

      startSession(call);
      await expect
        .poll(async () =>
          JSON.stringify(
            await call.journey.host.caller.session.list({ archived: false }),
          ),
        )
        .toContain('needs_input');
      await startCall(call);

      await expect
        .poll(spoken(call), { timeout: 10000 })
        .toContainEqual(expect.stringContaining(question));
    });

    it('says when a Started Session finishes, with what it said last', async () => {
      const call = await calling([
        { prompt: build, steps: [message('[COMPLETE] Dashboard built')] },
      ]);

      startSession(call);

      await expect
        .poll(spoken(call), { timeout: 10000 })
        .toContainEqual(expect.stringMatching(/finished\b.*Dashboard built/s));
    });

    it('says when a Started Session fails, and why', async () => {
      const call = await calling([
        { prompt: build, steps: [{ type: 'fail', message: 'Out of credits' }] },
      ]);

      startSession(call);

      await expect
        .poll(spoken(call), { timeout: 10000 })
        .toContainEqual(expect.stringMatching(/failed\b.*Out of credits/s));
    });

    it('never speaks of a Session its Session did not start', async () => {
      const call = await calling([{ prompt: build, steps: [elicitation] }]);

      const { sessionId } = await call.journey.host.caller.session.new({
        ...emptySessionInput,
        prompt: [{ type: 'text', text: build }],
      });

      await waitForAcpSnapshot(
        call.journey.host,
        sessionId,
        (snapshot) => snapshot.pendingElicitation !== null,
      );
      expect(spoken(call)()).not.toContainEqual(
        expect.stringContaining(question),
      );
    });

    it('says when an Agent its Session started finishes', async () => {
      const call = await calling([
        {
          prompt: 'Review it',
          steps: [subagent('running'), { type: 'yield' }, subagent('idle')],
        },
      ]);

      call.provider.call.requestWork('r1', 'Review it');

      await expect
        .poll(spoken(call), { timeout: 10000 })
        .toContainEqual(
          expect.stringMatching(new RegExp(`${reviewing}.*finished`)),
        );
    });
  },
);
