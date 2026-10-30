import type {
  InitializeRequest,
  PromptRequest,
} from '@agentclientprotocol/sdk';
import { session } from '@repo/db/schema';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { admittedPrompt, fulfilled } from './admission-startup.test.mocks';

const identities = fixtureAgents.map(({ agent }) => agent);

const prompt = [{ type: 'text', text: 'Continue' }] as const;

it.each(identities)(
  'reports a typed failed open when initial %s startup fails without a retry',
  async (agent) => {
    const initialization: InitializeRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        responses: {
          initialize: [
            { requests: initialization, error: 'Agent startup failed' },
          ],
        },
      },
      undefined,
      agent,
    );

    host.database.update(session).set({ agent }).run();
    await expect(
      host.caller.session.prompt({
        sessionId: 'session-1',
        prompt: [...prompt],
      }),
    ).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      cause: {
        openError: {
          type: 'failed',
          message: expect.stringContaining('Agent startup failed'),
        },
      },
    });
    expect(initialization).toHaveLength(1);
  },
);

it.each(identities)(
  'shares initial %s startup for overlapping cold prompts and acknowledges only the admitted Turn',
  async (agent) => {
    const startup = Promise.withResolvers<void>();
    const began = Promise.withResolvers<InitializeRequest>();
    const requests: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [{ type: 'wait-for-cancel' }],
        responses: {
          initialize: [{ received: began, waitFor: startup.promise }],
          'session/prompt': [{ requests }],
        },
      },
      undefined,
      agent,
    );

    host.database.update(session).set({ agent }).run();

    const firstPrompt = [
      { type: 'text', text: 'First' },
    ] satisfies PromptRequest['prompt'];

    const secondPrompt = [
      { type: 'text', text: 'Second' },
    ] satisfies PromptRequest['prompt'];

    const first = host.caller.session.prompt({
      sessionId: 'session-1',
      prompt: firstPrompt,
    });

    const second = host.caller.session.prompt({
      sessionId: 'session-1',
      prompt: secondPrompt,
    });

    const outcomes = Promise.allSettled([first, second]);
    await began.promise;
    startup.resolve();
    const results = await outcomes;
    expect(results.map((result) => result.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);

    const acknowledged = fulfilled(results);
    const admitted = admittedPrompt(results, firstPrompt, secondPrompt);

    expect(
      results.find((result) => result.status === 'rejected'),
    ).toMatchObject({
      reason: {
        code: 'CONFLICT',
        message: expect.stringContaining('cannot accept'),
      },
    });
    expect(acknowledged.value.messageId).toEqual(expect.any(String));
    expect(
      await host.caller.feed.row({
        sessionId: 'session-1',
        id: acknowledged.value.messageId ?? 'dropped',
      }),
    ).toMatchObject({ content: admitted });
    await expect
      .poll(() => requests)
      .toEqual([{ sessionId: 'owned-1', prompt: admitted }]);
    expect(host.agent.processes).toHaveLength(1);
  },
);

it.each(identities)(
  'rejects the waiting %s prompt when Engine shutdown starts',
  async (agent) => {
    const startup = Promise.withResolvers<void>();
    const began = Promise.withResolvers<InitializeRequest>();
    const requests: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        responses: {
          initialize: [{ received: began, waitFor: startup.promise }],
          'session/prompt': [{ requests }],
        },
      },
      undefined,
      agent,
    );

    host.database.update(session).set({ agent }).run();

    const settled = Promise.allSettled([
      host.caller.session.prompt({
        sessionId: 'session-1',
        prompt: [...prompt],
      }),
    ]);

    await began.promise;
    host.engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
    startup.resolve();
    expect(await settled).toMatchObject([
      {
        status: 'rejected',
        reason: { code: 'CONFLICT', message: 'The Engine is stopping' },
      },
    ]);
    expect(requests).toEqual([]);
  },
);
