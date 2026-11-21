import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type ReactElement, useState } from 'react';
import { Pressable } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { settleOverlays } from '#mocks/settle-overlays';
import { settleLayout } from '#mocks/story-layout';
import { Text } from '#primitives/content/text';
import { FieldGroup } from '#primitives/fields/field-group';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './dialog';

const second = 'Placeholder two';

const options = [
  { value: 'one', label: 'Placeholder one' },
  { value: 'two', label: second },
];

function PickerDialog(): ReactElement {
  const [choice, setChoice] = useState('one');

  return (
    <Dialog>
      <DialogTrigger>
        <Pressable role="button">
          <Text>Open</Text>
        </Pressable>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Placeholder</DialogTitle>
        <FieldGroup.Section>
          <FieldGroup.Picker
            title="Choice"
            presentation="menu"
            options={options}
            value={choice}
            onValueChange={setChoice}
          />
        </FieldGroup.Section>
      </DialogContent>
    </Dialog>
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Dialog/Picker',
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: (): ReactElement => <PickerDialog />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

type Play = NonNullable<Story['play']>;

async function openDialog({
  canvas,
  userEvent,
}: Parameters<Play>[0]): Promise<HTMLElement> {
  await userEvent.click(canvas.getByRole('button', { name: 'Open' }));
  const dialog = await body.findByRole('dialog', dialogName);
  await settleOverlays();

  return dialog;
}

const dialogName = { name: 'Placeholder' };

/*
 * A menu picker opens on pointer down and takes the pointer from the card under it, so the same press ends on the
 * scrim. Only a real pointer shows it: a synthetic click goes to the row whatever lies under the pointer.
 */
export const StaysOpenWhilePicking: Story = {
  play: async (context) => {
    const dialog = await openDialog(context);
    const row = within(dialog).getByRole('button', { name: /^Choice/ });
    await settleOverlays(row);
    await browserUser.click(row);

    const option = await body.findByRole('option', { name: second });
    await settleOverlays(option);
    await browserUser.click(option);

    await waitFor(() => expect(body.queryByRole('option')).toBeNull());
    await expect(
      within(body.getByRole('dialog', dialogName)).getByRole('button', {
        name: /^Choice/,
      }),
    ).toHaveTextContent(second);
  },
};

// The scrim still closes the dialog when the press both begins and ends on it.
export const ClosesOnScrimPress: Story = {
  play: async (context) => {
    await openDialog(context);
    await browserUser.click(document.body, { position: { x: 4, y: 4 } });
    await waitFor(() =>
      expect(body.queryByRole('dialog', dialogName)).toBeNull(),
    );
  },
};
