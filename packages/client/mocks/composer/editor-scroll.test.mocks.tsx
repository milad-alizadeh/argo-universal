import { shownText } from '@repo/kit/mocks/shown-text';
import { settleViewport } from '@repo/kit/settle-viewport';
import { fn, waitFor, expect } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
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
      await settleViewport(width);
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
