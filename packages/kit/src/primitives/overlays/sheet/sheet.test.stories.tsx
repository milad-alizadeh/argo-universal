import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths, settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Sheet } from './sheet';
import { PagedSheet } from './sheet.stories';

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Sheet',
  component: PagedSheet,
} satisfies Meta<typeof PagedSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

const fruitScreen = { name: 'Select Fruit' };

// A link pushes its page, Back returns to the page below, and a pick on the pushed page goes back with the new value.
function screensAt(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(width),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
      await userEvent.click(await body.findByRole('link', { name: /Fruit/ }));
      // A wide window's popover is still fading in from transparent when the page is pushed.
      await waitFor(() =>
        expect(body.getByRole('heading', fruitScreen)).toBeVisible(),
      );
      await userEvent.click(
        body.getByRole('button', { name: 'Back to Settings' }),
      );
      await waitFor(() =>
        expect(body.queryByRole('heading', fruitScreen)).toBeNull(),
      );
      await userEvent.click(body.getByRole('link', { name: /Fruit/ }));
      await userEvent.click(await body.findByRole('radio', { name: 'Cherry' }));
      await expect(
        await body.findByRole('link', { name: /Fruit.*Cherry/ }),
      ).toBeVisible();
    },
  };
}

export const ScreensInDrawer: Story = screensAt(layoutWidths.phone);

export const ScreensInPopover: Story = screensAt(layoutWidths.wide);

const answerSheet = { name: 'Sheet' };

// A sheet the app opens itself, with no trigger to anchor a popover on.
function TriggerlessSheet(props: { dismissible?: boolean }): ReactElement {
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  return (
    <View>
      <Button label="Open" onPress={() => setOpen(true)} />
      {closed ? <Text>Closed</Text> : null}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        onClosed={() => setClosed(true)}
        label="Sheet"
        dismissible={props.dismissible}
      >
        <Text>Sheet content</Text>
      </Sheet>
    </View>
  );
}

// vaul marks its drawer; a centred modal is a plain dialog.
function isDrawer(dialog: HTMLElement): boolean {
  return dialog.closest('[data-vaul-drawer]') !== null;
}

// Without a trigger, a phone raises a drawer and a medium window or wider centres a modal; either reports its close.
function triggerlessAt(layout: keyof typeof layoutWidths): Story {
  return {
    render: () => <TriggerlessSheet />,
    beforeEach: (): Promise<void> => settleLayout(layout),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Open' }));
      const dialog = await body.findByRole('dialog', answerSheet);
      await expect(isDrawer(dialog)).toBe(layout === 'phone');
      await userEvent.keyboard('{Escape}');
      await expect(await canvas.findByText('Closed')).toBeVisible();
      await expect(body.queryByRole('dialog', answerSheet)).toBeNull();
    },
  };
}

export const TriggerlessDrawerOnPhone: Story = triggerlessAt('phone');

export const TriggerlessModalOnTablet: Story = triggerlessAt('tablet');

export const TriggerlessModalOnDesktop: Story = triggerlessAt('wide');

// While the modal holds unsaved input, neither a press on the backdrop nor Escape closes it.
export const TriggerlessModalKeepsInput: Story = {
  render: () => <TriggerlessSheet dismissible={false} />,
  beforeEach: (): Promise<void> => settleLayout('tablet'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open' }));
    const dialog = await body.findByRole('dialog', answerSheet);
    // The modal fades in; it is open once it is visible, and only then is a dismissal it must refuse tried.
    await waitFor(() => expect(dialog).toBeVisible());
    const backdrop = document.elementFromPoint(4, 4);

    if (!backdrop) throw new Error('Nothing is drawn at the window corner.');
    await userEvent.click(backdrop);
    await userEvent.keyboard('{Escape}');
    await expect(body.getByRole('dialog', answerSheet)).toBeVisible();
    await expect(canvas.queryByText('Closed')).toBeNull();
  },
};

const rows = ['Row one', 'Row two', 'Row three'];

// A sheet of one Sheet.Screen, its content a few short rows.
function OnePageSheet(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Button label="Open" onPress={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen} label="Only">
        <Sheet.Screen name="only" title="Only">
          <View className="gap-3 p-4">
            {rows.map((row) => (
              <Text key={row}>{row}</Text>
            ))}
          </View>
        </Sheet.Screen>
      </Sheet>
    </View>
  );
}

// What the sheet draws below its last row, which is empty space.
function spaceBelow(dialog: HTMLElement, last: HTMLElement): number {
  return (
    dialog.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom
  );
}

// A sheet of one page is as tall as what it holds; it has no pages to keep a steady height between.
export const OnePageWrapsItsContent: Story = {
  render: () => <OnePageSheet />,
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open' }));
    const dialog = await body.findByRole('dialog', { name: 'Only' });
    const last = await body.findByText('Row three');
    await waitFor(() => expect(dialog).toBeVisible());
    await waitFor(() =>
      expect(spaceBelow(dialog, last)).toBeLessThan(window.innerHeight / 8),
    );
  },
};

// Pages keep one height as the reader moves between them, so a short first page is not shorter than the sheet's floor.
export const PagesKeepAFloor: Story = {
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const dialog = await body.findByRole('dialog', { name: 'Settings' });
    await waitFor(() =>
      expect(dialog.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        window.innerHeight / 2 - 1,
      ),
    );
  },
};
