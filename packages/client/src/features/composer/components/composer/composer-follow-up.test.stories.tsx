import { shownText } from '@repo/kit/mocks/shown-text';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { JSX } from 'react';
import { expect, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import {
  meta as composerMeta,
  type Story,
} from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { FollowUpComposer, predictedPrompt } from './composer-follow-up.mocks';
import type { ComposerProps } from './composer-types';

const useSuggestionLabel = predictedPrompt;

const meta = {
  ...composerMeta,
  title: 'Tests/Composer/FollowUp',
  render: (args: ComposerProps): JSX.Element => <FollowUpComposer {...args} />,
};

export default meta;

async function deliver(
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
): Promise<void> {
  await userEvent.click(
    canvas.getByRole('button', { name: 'Deliver prediction' }),
  );
}

export const TabAcceptsAnEditableDraft: Story = {
  play: async ({ canvas, args }) => {
    await settleLayout('wide');
    await deliver(canvas);
    const field = canvas.getByRole('textbox', { name: 'Message' });
    await expect(shownText(field)).toBe('');
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    await userEvent.click(field);
    await userEvent.keyboard('{Tab}');
    await waitFor(() => expect(shownText(field)).toBe(predictedPrompt));
    await expect(args.onSend).not.toHaveBeenCalled();
    await userEvent.click(field);
    await userEvent.keyboard('{End} please');
    await waitFor(() =>
      expect(args.onDraftChange).toHaveBeenLastCalledWith({
        text: `${predictedPrompt} please`,
        attachments: [],
      }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(args.onSend).toHaveBeenCalledWith({
      text: `${predictedPrompt} please`,
      attachments: [],
    });
  },
};

export const TapAcceptsOnAPhone: Story = {
  play: async ({ canvas, args }) => {
    await settleLayout('phone');
    await deliver(canvas);
    await userEvent.click(
      canvas.getByRole('button', { name: useSuggestionLabel }),
    );
    await waitFor(() =>
      expect(args.onDraftChange).toHaveBeenLastCalledWith({
        text: predictedPrompt,
        attachments: [],
      }),
    );
    const field = canvas.getByRole('textbox', { name: 'Message' });
    await expect(field).toHaveFocus();
    await expect(shownText(field)).toBe(predictedPrompt);
    await expect(args.onSend).not.toHaveBeenCalled();
    await expect(
      canvas.queryByRole('button', { name: useSuggestionLabel }),
    ).not.toBeInTheDocument();
  },
};

export const EscapeDismissalSurvivesRemount: Story = {
  play: async ({ canvas, args }) => {
    await settleLayout('wide');
    await deliver(canvas);
    await userEvent.click(canvas.getByRole('textbox', { name: 'Message' }));
    await userEvent.keyboard('{Escape}');
    await expect(
      canvas.queryByText(predictedPrompt, { exact: true }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remount Composer' }),
    );
    await expect(
      canvas.queryByText(predictedPrompt, { exact: true }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Next Turn' }));
    await expect(
      canvas.getByText(predictedPrompt, { exact: true }),
    ).toBeVisible();
    await expect(args.onDraftChange).not.toHaveBeenCalled();
    await expect(args.onSend).not.toHaveBeenCalled();
  },
};

export const LatePredictionCannotReplaceAnEditedDraft: Story = {
  play: async ({ canvas, args }) => {
    await settleLayout('wide');
    const field = canvas.getByRole('textbox', { name: 'Message' });
    await userEvent.type(field, 'hello');
    await userEvent.keyboard(
      '{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}',
    );
    await waitFor(() => expect(shownText(field)).toBe(''));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Deliver prediction' }),
    );
    await expect(
      canvas.queryByText(predictedPrompt, { exact: true }),
    ).not.toBeInTheDocument();
    await expect(args.onSend).not.toHaveBeenCalled();
  },
};

export const TurningOffDoesNotReviveTheCurrentPrediction: Story = {
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await deliver(canvas);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle suggestions' }),
    );
    await expect(
      canvas.queryByText(predictedPrompt, { exact: true }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle suggestions' }),
    );
    await expect(
      canvas.queryByText(predictedPrompt, { exact: true }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Next Turn' }));
    await expect(
      canvas.getByText(predictedPrompt, { exact: true }),
    ).toBeVisible();
  },
};

export const EnterDoesNotSendGhostText: Story = {
  play: async ({ canvas, args }) => {
    await settleLayout('wide');
    await deliver(canvas);
    await userEvent.click(canvas.getByRole('textbox', { name: 'Message' }));
    await userEvent.keyboard('{Enter}');
    await expect(args.onSend).not.toHaveBeenCalled();
    await expect(args.onDraftChange).not.toHaveBeenCalled();
  },
};
