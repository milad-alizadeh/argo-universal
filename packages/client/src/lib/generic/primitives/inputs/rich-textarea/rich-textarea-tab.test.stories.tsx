import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { Button } from '#primitives/buttons/button/button';
import {
  exampleLabel as label,
  RichTextareaExample,
  shownText,
} from '../../../../../../mocks/rich-textarea-example';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';

// Outside a list, Tab and ⇧Tab move focus to the field's neighbours and type nothing.

const meta = {
  title: 'Tests/RichTextareaTab',
  component: RichTextareaExample,
  args: { onChangeText: fn(), onSubmit: fn() },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
  render: (args): React.JSX.Element => (
    <>
      <Button label="Attach" onPress={fn()} />
      <RichTextareaExample {...args} />
      <Button label="Send" onPress={fn()} />
    </>
  ),
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

function tabbedOut({ keys, to }: { keys: string; to: string }): Story {
  return {
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole('textbox', { name: label });
      await userEvent.type(field, 'Ship it');
      await userEvent.keyboard(keys);
      await waitFor(() =>
        expect(canvas.getByRole('button', { name: to })).toHaveFocus(),
      );
      await expect(shownText(field)).toBe('Ship it');
      await expect(args.onChangeText).toHaveBeenLastCalledWith('Ship it');
    },
  };
}

export const TabMovesFocusForward = tabbedOut({ keys: '{Tab}', to: 'Send' });

export const ShiftTabMovesFocusBack = tabbedOut({
  keys: '{Shift>}{Tab}{/Shift}',
  to: 'Attach',
});
