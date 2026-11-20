import { shownText } from '@repo/kit/mocks/shown-text';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { fn, waitFor, expect } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import { composerImages } from '../composer-mock';
import {
  type Story,
  SendingComposer,
} from './composer-story-context.test.mocks';
import { typedLines } from './composer-test-contract.test.mocks';
import { linesTwoToTen, expectSendUnobscured } from './work-status.test.mocks';

export function editorScrollsAfterTenLines(width: number): Story {
  return {
    render: () => <SendingComposer onSend={fn()} />,
    play: async ({ canvas }) => {
      await settleLayout(width);
      const input = await canvas.findByRole('textbox', { name: 'Message' });
      await browserUserEvent.type(input, 'Line 1');
      const oneLineHeight = input.clientHeight;
      // Up to ten lines the field grows and every line shows without scrolling.
      await browserUserEvent.type(input, typedLines(linesTwoToTen));
      await waitFor(() => expect(input.scrollHeight).toBe(input.clientHeight));
      await expect(input.clientHeight).toBeGreaterThan(oneLineHeight);
      const tenLinesHeight = input.clientHeight;
      // Past ten lines it stops growing and scrolls instead.
      await browserUserEvent.type(input, typedLines('\nLine 11\nLine 12'));
      await expect(shownText(input)).toBe(
        `Line 1${linesTwoToTen}\nLine 11\nLine 12`,
      );
      await expect(input.clientHeight).toBe(tenLinesHeight);
      await expect(input.scrollHeight).toBeGreaterThan(input.clientHeight);
      await expectSendUnobscured(canvas.getByRole('button', { name: 'Send' }));
      await browserUserEvent.wheel(input, { delta: { y: 200 } });
      await waitFor(() => expect(input.scrollTop).toBeGreaterThan(0));
    },
  };
}

export const attachmentsScrollWithDraft: Story = {
  args: {
    draft: {
      text: Array.from({ length: 24 }, (_, index) => `Line ${index + 1}`).join(
        '\n',
      ),
      attachments: composerImages.slice(0, 1),
    },
  },
  play: async ({ canvas }) => {
    await settleLayout('phone');
    const input = await canvas.findByRole('textbox', { name: 'Message' });
    const attachment = canvas.getByRole('img', { name: 'screenshot.png' });
    const send = canvas.getByRole('button', { name: 'Send' });

    const attachmentOffset = (): number =>
      attachment.getBoundingClientRect().top - send.getBoundingClientRect().top;

    const initialOffset = attachmentOffset();

    await browserUserEvent.wheel(input, { delta: { y: 150 } });
    await waitFor(() => expect(attachmentOffset()).toBeLessThan(initialOffset));
    await expectSendUnobscured(send);
  },
};
