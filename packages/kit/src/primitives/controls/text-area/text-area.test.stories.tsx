import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type ReactElement, useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { settleLayout } from '#mocks/story-layout';
import { IconButton } from '#primitives/actions/icon-button';
import { TextArea } from './text-area';

const label = 'Message';

// A chat's message field: Send clears it, as a footer's field is cleared once its message is sent.
function MessageField(): ReactElement {
  const [draft, setDraft] = useState('');
  const send = (): void => setDraft('');

  return (
    <TextArea
      label={label}
      value={draft}
      onChangeText={setDraft}
      action={
        <IconButton icon="arrow-up" accessibilityLabel="Send" onPress={send} />
      }
    />
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Controls/TextArea',
  component: MessageField,
  beforeEach: async (): Promise<void> => {
    await settleLayout('phone');
  },
} satisfies Meta<typeof MessageField>;

export default meta;

type Story = StoryObj<typeof meta>;

const height = (element: HTMLElement): number =>
  element.getBoundingClientRect().height;

// Sending clears the field, which then takes one line again however many its message had.
export const ShrinksToOneLineAfterSend: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: label });
    const oneLine = height(field);

    await userEvent.type(field, 'First line{Shift>}{Enter}{/Shift}Second line');
    await waitFor(() => expect(height(field)).toBeGreaterThan(oneLine));
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(field).toHaveValue(''));
    await waitFor(() => expect(height(field)).toBe(oneLine));
  },
};
