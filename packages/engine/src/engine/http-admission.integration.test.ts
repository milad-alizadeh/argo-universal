import type {
  PromptRequest,
  NewSessionRequest,
} from '@agentclientprotocol/sdk';
import { agentAdapters } from '@repo/agents';
import { session } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  home,
  database,
  port,
  closeServer,
  replaceHttpHost,
} from '#mocks/engine-http';
import { scriptedEngineInput } from '#mocks/scripted-engine';

it.each(agentAdapters.map((adapter): string => adapter.agent))(
  'does not send the waiting %s prompt after HTTP closure begins',
  async (agent): Promise<void> => {
    await closeServer();
    const startup = Promise.withResolvers<void>();
    const began = Promise.withResolvers<NewSessionRequest>();
    const commands: PromptRequest[] = [];
    const host = await startEngineTestHost({
      database,
      runtimeDirectory: home,
      ...scriptedEngineInput(
        {
          steps: [],
          responses: {
            'session/new': [{ received: began, waitFor: startup.promise }],
            'session/prompt': [{ requests: commands }],
          },
        },
        agent,
      ),
    });
    database.update(session).set({ agent }).run();
    replaceHttpHost(host);
    const response = fetch(`http://127.0.0.1:${port}/trpc/session.prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
        prompt: [{ type: 'text', text: 'Too late' }],
      }),
    }).catch((): null => null);
    await began.promise;
    const closing = closeServer();
    startup.resolve();
    await closing;
    await new Promise<void>((resolve): NodeJS.Immediate =>
      setImmediate(resolve),
    );
    expect(commands).toEqual([]);
    await response;
  },
);
