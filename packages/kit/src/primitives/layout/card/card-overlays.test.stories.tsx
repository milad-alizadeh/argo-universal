import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { useListPlace } from '#kit/list-place';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Sheet } from '#primitives/overlays/sheet';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '../../overlays/dialog/dialog';
import { Card } from './card';

// Reads the place its List would draw in.
function PlaceProbe({ name }: { name: string }): ReactElement {
  return <Text>{`${name} place: ${useListPlace()}`}</Text>;
}

function CardWithSheet(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Card title="Card">
      <PlaceProbe name="Card" />
      <Button label="Open sheet" onPress={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen} label="Options">
        <PlaceProbe name="Sheet" />
      </Sheet>
    </Card>
  );
}

function CardWithDialog(): ReactElement {
  return (
    <Card title="Card">
      <Dialog>
        <DialogTrigger>
          <Button label="Open dialog" />
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Options</DialogTitle>
          <PlaceProbe name="Dialog" />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Layout/Card',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

// A Card's body is a place of its own, but a Sheet or a Dialog opened from it is a page again.
export const ASheetOpenedFromACardIsAPage: Story = {
  render: () => <CardWithSheet />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Card place: card')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Open sheet' }));
    const probe = await body.findByText('Sheet place: page');

    await waitFor(() => expect(probe).toBeVisible());
  },
};

export const ADialogOpenedFromACardIsAPage: Story = {
  render: () => <CardWithDialog />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));
    const probe = await body.findByText('Dialog place: page');

    await waitFor(() => expect(probe).toBeVisible());
  },
};
