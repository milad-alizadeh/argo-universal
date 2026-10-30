import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { configuration } from './restore.test.mocks';

it.each(['model', 'mode'])(
  'refuses to reopen or prompt when the selected %s is no longer offered',
  async (configId) => {
    const prompts: PromptRequest[] = [];
    const value = configId === 'model' ? 'small' : 'read-only';

    const unavailable = configuration.map((option) =>
      option.id === configId && option.type === 'select'
        ? {
            ...option,
            options: option.options
              .flatMap((choice) =>
                'value' in choice ? [choice] : choice.options,
              )
              .filter((choice) => choice.value !== value),
          }
        : option,
    );

    const host = await startAcpEngine({
      steps: [],
      configOptions: configuration,
      responses: {
        'session/prompt': [{ requests: prompts }],
        'session/resume': [
          { result: { configOptions: unavailable } },
          { result: { configOptions: unavailable } },
        ],
      },
    });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'First' }],
    });

    await waitForAcpSessionIdle(host, created.sessionId);
    await host.caller.session.setConfigOption({
      ...created,
      configId,
      type: 'id',
      value,
    });
    await host.caller.session.close(created);
    await expect(host.caller.session.open(created)).rejects.toThrow(
      `${configId}=${value}`,
    );
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Must not run' }],
      }),
    ).rejects.toThrow(`${configId}=${value}`);
    expect(prompts).toHaveLength(1);
  },
);
