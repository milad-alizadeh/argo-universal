import { settleLayout } from '@repo/kit/mocks/story-layout';
import { recordedSessionOptions } from '@repo/mocks/app';
import { expect, fn } from 'storybook/test';
import { oversizedComposerImage } from '../composer-mock';
import type { Story } from './composer-story-context.test.mocks';
import { pickerCatalogs } from './recorded-catalog.test.mocks';

export function stopPrecedence(
  width: number,
  agentIndex: number,
  disabled: boolean,
): Story {
  const catalog = pickerCatalogs[agentIndex];

  if (!catalog)
    throw new Error(`Recorded catalog needs an Agent at index ${agentIndex}.`);

  return {
    args: {
      draft: {
        text: 'A draft during a Turn.',
        attachments: [oversizedComposerImage],
      },
      sending: true,
      disabled,
      sendable: false,
      onStop: fn(),
      configuration: {
        agent: catalog.agent,
        configOptions: recordedSessionOptions(catalog.agent.id),
        onConfigChange: fn(),
        checkout: { branch: 'main', newWorktree: false },
        turnRunning: true,
      },
    },
    play: async ({ canvas, userEvent, args }): Promise<void> => {
      await settleLayout(width);
      const stop = canvas.getByRole('button', { name: 'Stop' });
      await expect(stop).toHaveProperty('disabled', disabled);
      await expect(
        canvas.queryByRole('button', { name: 'Send' }),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByRole('progressbar', { name: 'Sending' }),
      ).not.toBeInTheDocument();

      if (!disabled) await userEvent.click(stop);
      await expect(args.onStop).toHaveBeenCalledTimes(disabled ? 0 : 1);
      await expect(args.onSend).not.toHaveBeenCalled();
    },
  };
}
