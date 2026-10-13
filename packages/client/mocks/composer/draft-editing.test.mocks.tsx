import { fn, expect, waitFor } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import { composerImages } from '../composer-mock';
import { shownText } from '../rich-textarea-example';
import {
  type Story,
  SendingComposer,
} from './composer-story-context.test.mocks';
import {
  typedLines,
  multilineSpacingPrompt,
  spacingPrompt,
  readOnlyAttribute,
  agentModelLabel,
} from './composer-test-contract.test.mocks';

export const inspectorOpenColumn = 688;

export function multiline(width: number): Story {
  const prompt = fn();

  return {
    render: () => <SendingComposer onSend={prompt} />,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await browserUserEvent.type(input, typedLines(multilineSpacingPrompt));
      await expect(shownText(input)).toBe(multilineSpacingPrompt);
      await expect(prompt).not.toHaveBeenCalled();
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
      await expect(prompt).toHaveBeenCalledWith({
        text: multilineSpacingPrompt,
        attachments: [],
      });
      await waitFor(() => expect(shownText(input)).toBe(''));
    },
  };
}

export function sending(width: number): Story {
  return {
    args: { draft: { text: spacingPrompt, attachments: [] }, sending: true },
    play: async ({ canvas, args }) => {
      await settleViewport(width);
      await expect(
        canvas.getByRole('button', { name: 'Send' }),
      ).toHaveAttribute('aria-busy', 'true');
      const input = canvas.getByRole('textbox');
      await expect(input).toHaveAttribute(readOnlyAttribute, 'true');
      await expect(shownText(input)).toBe(spacingPrompt);
      await browserUserEvent.type(input, 'Another prompt');
      await expect(shownText(input)).toBe(spacingPrompt);
      await expect(
        canvas.getByRole('button', {
          name: 'Attach',
        }),
      ).toBeDisabled();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      // The picker locks too, so a pending configuration change cannot be overtaken.
      await expect(
        canvas.getByRole('button', { name: agentModelLabel }),
      ).toBeDisabled();
      await expect(args.onSend).not.toHaveBeenCalled();
    },
  };
}

export function disabled(width: number): Story {
  return {
    args: {
      draft: {
        text: spacingPrompt,
        attachments: composerImages.slice(0, 1),
      },
      disabled: true,
    },
    play: async ({ canvas, args }) => {
      await settleViewport(width);
      const input = canvas.getByRole('textbox');
      await expect(input).toHaveAttribute(readOnlyAttribute, 'true');
      await browserUserEvent.type(input, 'Another prompt');
      await expect(shownText(input)).toBe(spacingPrompt);
      await expect(
        canvas.getByRole('button', {
          name: 'Attach',
        }),
      ).toBeDisabled();
      await expect(
        canvas.getByRole('button', { name: 'Remove screenshot.png' }),
      ).toBeDisabled();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await expect(
        canvas.getByRole('img', { name: 'screenshot.png' }),
      ).toBeVisible();
      await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
      await expect(args.onDraftChange).not.toHaveBeenCalled();
      await expect(args.onSend).not.toHaveBeenCalled();
    },
  };
}
