import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Sheet } from './sheet';
import { useSheet } from './sheet-screens';
import { PagedSheet } from './sheet.stories';

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Sheet/Height',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

const rows = ['Row one', 'Row two', 'Row three'];

// What the sheet draws below its last row, which is empty space; the sheet's own bottom padding is about 40px.
const maxPadding = 64;

const pushedPage = { name: 'pushed', title: 'Pushed' };

function Rows(): ReactElement {
  return (
    <View className="gap-3 p-4">
      {rows.map((row) => (
        <Text key={row}>{row}</Text>
      ))}
    </View>
  );
}

function PushButton(): ReactElement {
  const sheet = useSheet();

  return (
    <Button
      label="Push"
      onPress={() => sheet.push({ ...pushedPage, children: <Rows /> })}
    />
  );
}

// One declared Sheet.Screen that pushes a page of its own at runtime, as a drill-in choice or a Subagent's Feed does.
function PushingSheet(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Button label="Open" onPress={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen} label="Pushing">
        <Sheet.Screen name="root" title="Root">
          <PushButton />
        </Sheet.Screen>
      </Sheet>
    </View>
  );
}

function spaceBelow(dialog: HTMLElement, last: HTMLElement): number {
  return (
    dialog.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom
  );
}

const heightOf = (dialog: HTMLElement): number =>
  Math.round(dialog.getBoundingClientRect().height);

// A page the sheet had no say in beforehand does not lift it to the multi-page floor: it is as tall as the page it holds.
export const PushedPageWrapsItsContent: Story = {
  render: () => <PushingSheet />,
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open' }));
    const dialog = await body.findByRole('dialog', { name: 'Pushing' });
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.click(await body.findByRole('button', { name: 'Push' }));
    const last = await body.findByText('Row three');
    await waitFor(() =>
      expect(spaceBelow(dialog, last)).toBeLessThan(maxPadding),
    );
  },
};

// Declared pages hold one height as the reader moves between them, whichever page is showing.
export const PagedSheetKeepsOneHeight: Story = {
  render: () => <PagedSheet />,
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const dialog = await body.findByRole('dialog', { name: 'Settings' });
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.click(await body.findByRole('link', { name: /Fruit/ }));
    await body.findByRole('heading', { name: 'Select Fruit' });
    const onPushed = heightOf(dialog);
    await userEvent.click(
      body.getByRole('button', { name: 'Back to Settings' }),
    );
    await waitFor(() =>
      expect(body.queryByRole('heading', { name: 'Select Fruit' })).toBeNull(),
    );
    await waitFor(() => expect(heightOf(dialog)).toBe(onPushed));
  },
};
