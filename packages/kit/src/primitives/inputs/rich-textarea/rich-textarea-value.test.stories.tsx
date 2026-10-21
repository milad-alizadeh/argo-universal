import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { Button } from '#primitives/actions/button';
import { shownText } from '../../../../mocks/shown-text';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { RichTextarea } from './rich-textarea';
import {
  exampleLabel as label,
  examplePlaceholder,
  useExampleValue,
} from './rich-textarea-example.mocks';

// A value from outside replaces the field's text, and the next edit is still sent, starting with its first key.

const restoredDraft = 'Restored draft';

interface DraftFieldProps {
  initialValue: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}

// The Composer's draft: sending clears it, and a kept draft can be restored into it.
function DraftField({
  initialValue,
  onChangeText,
  onSubmit,
}: DraftFieldProps): React.JSX.Element {
  const { controlled, setValue } = useExampleValue(initialValue, onChangeText);

  const send = (): void => {
    onSubmit();
    setValue('');
  };

  return (
    <>
      <RichTextarea
        accessibilityLabel={label}
        placeholder={examplePlaceholder}
        {...controlled}
        onSubmit={send}
      />
      <Button label="Send" onPress={send} />
      <Button label="Restore" onPress={() => setValue(restoredDraft)} />
    </>
  );
}

const meta = {
  title: 'Tests/RichTextareaValue',
  component: DraftField,
  args: { initialValue: '', onChangeText: fn(), onSubmit: fn() },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta<typeof DraftField>;

export default meta;

type Story = StoryObj<typeof meta>;

// Sent with Return, which keeps the caret in the field, or with Send, which takes it away.
type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

function typedAfterSending(send: (canvas: Canvas) => Promise<void>): Story {
  return {
    play: async ({ canvas, args }) => {
      const field = canvas.getByRole('textbox', { name: label });
      await userEvent.type(field, 'Ship it');
      await send(canvas);
      await waitFor(() => expect(shownText(field)).toBe(''));
      await expect(args.onSubmit).toHaveBeenCalledOnce();
      await userEvent.type(field, 'N');
      await waitFor(() =>
        expect(args.onChangeText).toHaveBeenLastCalledWith('N'),
      );
      await expect(shownText(field)).toBe('N');
    },
  };
}

export const TypingAfterSendingWithReturn = typedAfterSending(async () => {
  await userEvent.keyboard('{Enter}');
});

export const TypingAfterSendingWithTheButton = typedAfterSending(
  async (canvas) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
  },
);

// A key typed at the end of the restored draft sends the draft with that key, once.
async function expectKeyAddedAtEnd(
  field: HTMLElement,
  onChangeText: DraftFieldProps['onChangeText'],
): Promise<void> {
  await userEvent.click(field);
  await userEvent.keyboard('{End}N');
  await waitFor(() =>
    expect(onChangeText).toHaveBeenLastCalledWith(`${restoredDraft}N`),
  );
  await expect(onChangeText).toHaveBeenCalledOnce();
}

export const TypingIntoADraftRestoredOnOpen: Story = {
  args: { initialValue: restoredDraft },
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await expect(shownText(field)).toBe(restoredDraft);
    await expectKeyAddedAtEnd(field, args.onChangeText);
  },
};

export const TypingIntoADraftRestoredLater: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.click(canvas.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(shownText(field)).toBe(restoredDraft));
    await expect(args.onChangeText).not.toHaveBeenCalled();
    await expectKeyAddedAtEnd(field, args.onChangeText);
  },
};
