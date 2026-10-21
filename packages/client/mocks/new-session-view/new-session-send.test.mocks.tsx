import { eachLayout, layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import { expect } from 'storybook/test';
import type { ReadySessionNewViewProps } from '../../src/screens/sessions/$id/session-new-view';
import {
  openingNewSession,
  readyNewSession,
  typedDraft,
} from '../../src/screens/sessions/$id/session-new-view.mocks';
import type { Story } from './new-session-story.test.mocks';

const sendLabel = 'Send';

export function readyArgs(
  changes: Partial<ReadySessionNewViewProps>,
): Story['args'] {
  return { view: { state: 'ready', ...readyNewSession, ...changes } };
}

export const sendsTheFirstPrompt: Story = {
  args: readyArgs({ draft: typedDraft }),
  play: async ({ args, canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(
      await canvas.findByRole('button', { name: sendLabel }),
    );

    if (args.view.state !== 'ready') throw new Error('The view is not ready.');
    await expect(args.view.onSend).toHaveBeenCalledOnce();
    await expect(args.view.onSend).toHaveBeenCalledWith(typedDraft);
  },
};

export const sendsWhileTheSessionOpens: Story = {
  args: readyArgs(openingNewSession),
  play: async ({ args, canvas, userEvent }) => {
    await eachLayout(async () => {
      await expect(
        await canvas.findByRole('button', { name: 'Agent and model' }),
      ).toBeEnabled();
      await expect(
        canvas.getByRole('button', { name: sendLabel }),
      ).toBeEnabled();
    });
    await userEvent.click(canvas.getByRole('button', { name: sendLabel }));

    if (args.view.state !== 'ready') throw new Error('The view is not ready.');
    await expect(args.view.onSend).toHaveBeenCalledWith(typedDraft);
  },
};
