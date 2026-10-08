import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AgentEvent } from '@repo/agents';
import { afterEach, expect, it, vi } from 'vitest';
import { connect } from '../../../packages/agents/claude/connect';
import { mockCliScenarioEnvironment } from '../mock-cli';
import { writeMockClaude } from './write-mock-claude';

const directories: string[] = [];
afterEach(async (): Promise<void> => {
  vi.unstubAllEnvs();
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

it('reports an unsupported message through the real SDK adapter', async (): Promise<void> => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'sdk-message-'));
  directories.push(cwd);
  await writeMockClaude(cwd, { recording: 'edit-and-command' });
  vi.stubEnv('PATH', cwd);
  for (const [name, value] of Object.entries(
    mockCliScenarioEnvironment({ malformedPayload: true }),
  ))
    vi.stubEnv(name, value);
  const rejected: AgentEvent[] = [];
  const session = await connect(
    { sessionId: 'session-1', cwd, vendorSessionId: null, configOptions: [] },
    {
      message: (): void => {},
      event: (event): void => {
        if (event.type === 'agent.messageRejected') rejected.push(event);
      },
      failed: (): void => {},
    },
    new AbortController().signal,
  );
  try {
    await session.run({
      type: 'agent.prompt',
      turnId: 'turn-1',
      content: [{ type: 'text', text: 'Hi' }],
    });
    await expect
      .poll((): AgentEvent[] => rejected)
      .toEqual([
        {
          type: 'agent.messageRejected',
          reason: 'Unsupported SDK message: future_message',
        },
        {
          type: 'agent.messageRejected',
          reason: 'Unsupported SDK message: http',
        },
      ]);
  } finally {
    await session.stop();
  }
});
