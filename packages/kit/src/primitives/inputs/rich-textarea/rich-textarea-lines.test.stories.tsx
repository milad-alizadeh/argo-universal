import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { shownText } from '../../../../mocks/shown-text';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import {
  exampleLabel as label,
  RichTextareaExample,
} from './rich-textarea-example.mocks';

// Where a line ends in a list item: ⇧Return, ⇧Tab and a marker typed after a line break.

const meta = {
  title: 'Tests/RichTextareaLines',
  component: RichTextareaExample,
  args: { onChangeText: fn(), onSubmit: fn() },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

const twoItems = 'First\nSecond';

interface TypedBlock {
  typed: string;
  sent: string;
  shown: string;
}

function typedBlock({ typed, sent, shown }: TypedBlock): Story {
  return {
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole('textbox', { name: label });
      await userEvent.type(field, typed);
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith(sent),
      );
      await expect(shownText(field)).toBe(shown);
      await expect(args.onSubmit).not.toHaveBeenCalled();
    },
  };
}

export const ShiftReturnInAnItemAddsAnItem = typedBlock({
  typed: '1. First{Shift>}{Enter}{/Shift}Second',
  sent: '1. First\n2. Second',
  shown: twoItems,
});

export const ShiftTabOnATopLevelItemLeavesTheList = typedBlock({
  typed: '- First{Enter}Second{Shift>}{Tab}{/Shift}',
  sent: '- First\n\nSecond',
  shown: 'First\n\nSecond',
});

export const NumberedListStartsAtTheNumberTyped = typedBlock({
  typed: '1. First{Enter}{Shift>}{Tab}{/Shift}3. Third{Enter}Fourth',
  sent: '1. First\n\n3. Third\n4. Fourth',
  shown: 'First\n\n\n\n\nThird\nFourth',
});

export const MarkerAfterAShiftReturnStartsAList = typedBlock({
  typed: 'Steps{Shift>}{Enter}{/Shift}1. First{Enter}Second',
  sent: 'Steps\n\n1. First\n2. Second',
  shown: 'Steps\n\nFirst\nSecond',
});
