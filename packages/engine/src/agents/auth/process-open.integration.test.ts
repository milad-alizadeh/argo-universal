import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { launchAcpProcess } from '../acp/process';

it.each(['initialize-exit', 'open-exit'] as const)(
  'a real Agent %s preserves exit status and drained stderr',
  async (scenario) => {
    const host = await startAcpEngine({
      steps: [],
      launchProcess: (launch) =>
        launchAcpProcess({ ...launch, ...scriptedAgentCommand(scenario) }),
    });

    await expect(
      host.caller.session.new(emptySessionInput),
    ).rejects.toMatchObject({
      cause: {
        openError: {
          type: 'failed',
          message: 'Agent exited with status 17\nAgent fixture failed',
        },
      },
    });
  },
);
