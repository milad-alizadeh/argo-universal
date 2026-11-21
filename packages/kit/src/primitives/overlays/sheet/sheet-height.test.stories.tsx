import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { settleOverlays } from '#mocks/settle-overlays';
import { settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Sheet } from './sheet';
import { ScrollingList } from './sheet-fixtures';
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

function ExpandingSheet(): ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <Sheet
      open
      onOpenChange={() => {}}
      label="Confirm changes"
      detents={['large']}
      footer={
        <View className="gap-2 p-4">
          <Button label="Continue" />
          <Button label="Cancel" variant="text" />
        </View>
      }
    >
      <Button label="Show details" onPress={() => setExpanded(true)} />
      {expanded &&
        ScrollingList.items.map((item) => (
          <Text key={item} className="p-4">
            {item}
          </Text>
        ))}
    </Sheet>
  );
}

export const FooterStaysPinnedWhileTheBodyScrolls: Story = {
  render: () => <ExpandingSheet />,
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ userEvent }) => {
    const dialog = await body.findByRole('dialog', { name: 'Confirm changes' });
    await settleOverlays(dialog);

    const sheet = within(dialog);
    const scroll = sheet.getByRole('region', { name: 'Confirm changes' });
    const primary = sheet.getByRole('button', { name: 'Continue' });
    const secondary = sheet.getByRole('button', { name: 'Cancel' });

    const footerPosition = (): number[] => [
      primary.getBoundingClientRect().top,
      secondary.getBoundingClientRect().top,
    ];

    const initialPosition = footerPosition();

    await userEvent.click(sheet.getByRole('button', { name: 'Show details' }));
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight),
    );
    scroll.scrollTop = scroll.scrollHeight;

    const last = sheet.getByText(ScrollingList.items.at(-1) ?? '');
    await waitFor(async () => {
      const edge = last.getBoundingClientRect().bottom;
      await expect(edge).toBeLessThanOrEqual(
        scroll.getBoundingClientRect().bottom,
      );
      await expect(edge).toBeLessThan(primary.getBoundingClientRect().top);
    });
    await expect(footerPosition()).toEqual(initialPosition);
  },
};
