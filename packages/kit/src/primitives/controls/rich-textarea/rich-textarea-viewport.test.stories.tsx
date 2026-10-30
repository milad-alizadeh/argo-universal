import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { expect as browserExpect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { settleLayout } from '#mocks/story-layout';
import {
  RichTextareaExample,
  exampleLabel,
} from './rich-textarea-example.mocks';
import { scrollingSuggestionsRichTextarea } from './rich-textarea-fixtures';

const meta = {
  title: 'Tests/Design System/Primitives/Controls/RichTextarea/Viewport',
  component: RichTextareaExample,
  parameters: { screenPreview: true },
  args: {
    onChangeText: fn(),
    onSubmit: fn(),
    suggestions: scrollingSuggestionsRichTextarea.suggestions,
  },
  render: (args): React.JSX.Element => (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <RichTextareaExample {...args} />
    </div>
  ),
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide', 600);
  },
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstChoiceCanBePressedInAShortWindow: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    const first = await screen.findByRole('option', { name: /option-1 / });
    await browserExpect.element(first).toBeInViewport({ ratio: 1 });
    await userEvent.click(first);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/option-1 '),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const ArrowDownScrollsEachChoiceIntoView: Story = {
  play: async ({ canvas }) => {
    const textbox = canvas.getByRole('textbox', { name: exampleLabel });

    // A pointer left over the menu by an earlier story would highlight whichever row scrolls under it.
    await userEvent.hover(textbox);
    await userEvent.type(textbox, '/');
    await screen.findByRole('option', { name: /option-1 / });
    await userEvent.keyboard('{ArrowDown}'.repeat(10));
    const eleventh = screen.getByRole('option', { name: /option-11 / });
    await waitFor(() =>
      expect(eleventh).toHaveAttribute('aria-selected', 'true'),
    );
    await browserExpect.element(eleventh).toBeInViewport({ ratio: 1 });
  },
};

export const KeyboardScrollsTheLastChoiceIntoView: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    await screen.findByRole('option', { name: /option-1 / });
    await userEvent.keyboard('{ArrowUp}');
    const last = screen.getByRole('option', { name: /option-12 / });
    await browserExpect.element(last).toBeInViewport({ ratio: 1 });
    await userEvent.click(last);
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('/option-12 '),
    );
  },
};

const viewportReferences = Array.from({ length: 8 }, (_, index) => ({
  number: index + 1,
  title: `Reference ${index + 1}`,
  state: 'open' as const,
}));

export const ReferencesShareViewportAndKeyboardScrolling: Story = {
  args: { references: viewportReferences },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide', 300);
  },
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '#',
    );
    const first = await screen.findByRole('option', { name: /#1 Reference 1/ });
    await browserExpect.element(first).toBeInViewport({ ratio: 1 });
    await userEvent.keyboard('{ArrowUp}');
    const last = screen.getByRole('option', { name: /#8 Reference 8/ });
    await browserExpect.element(last).toBeInViewport({ ratio: 1 });
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('#8 '),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
};
