import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { useListPlace } from '#kit/list-place';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
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
  title: 'Tests/Design System/Primitives/Layout/Card/Overlays',
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

// A row's tile reaches 4 beyond the card's content edge, so the row's own 4 of padding puts its marks on that edge.
const tileReach = 4;

const sameEdge = 1;

// A kit List drawn directly in a card, not through a Plugin's tree, lines its rows up with the card's own content.
export const AListDrawnInACardLinesUpWithItsContent: Story = {
  render: () => (
    <Card title="Card">
      <Text>Content</Text>
      <List>
        <ListItem title="Row" />
      </List>
    </Card>
  ),
  play: async ({ canvas }) => {
    const content = canvas.getByText('Content').getBoundingClientRect();
    const text = canvas.getByText('Row');
    const row = text.closest('[role=group]') ?? text;

    await expect(
      Math.abs(content.left - tileReach - row.getBoundingClientRect().left),
    ).toBeLessThanOrEqual(sameEdge);
  },
};
