import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { Button } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Sheet } from './sheet';
import { PagedSheet } from './sheet.stories';

const meta = {
  title: 'Tests/Sheet',
  component: PagedSheet,
} satisfies Meta<typeof PagedSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

const fruitPage = { name: 'Select Fruit' };

// A link pushes its page, Back returns to the page below, and a pick on the pushed page goes back with the new value.
function pagesAt(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(width),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
      await userEvent.click(await body.findByRole('button', { name: /Fruit/ }));
      await expect(await body.findByRole('heading', fruitPage)).toBeVisible();
      await userEvent.click(
        body.getByRole('button', { name: 'Back to Settings' }),
      );
      await waitFor(() =>
        expect(body.queryByRole('heading', fruitPage)).toBeNull(),
      );
      await userEvent.click(body.getByRole('button', { name: /Fruit/ }));
      await userEvent.click(
        await body.findByRole('button', { name: 'Cherry' }),
      );
      await expect(
        await body.findByRole('button', { name: /Fruit.*Cherry/ }),
      ).toBeVisible();
    },
  };
}

export const PagesInDrawer: Story = pagesAt(layoutWidths.phone);

export const PagesInPopover: Story = pagesAt(layoutWidths.wide);

const answerSheet = { name: 'Answer the Agent' };

// A sheet the app opens itself, with no trigger to anchor a popover on.
function TriggerlessSheet(props: { dismissible?: boolean }): ReactElement {
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  return (
    <View>
      <Button label="Answer" onPress={() => setOpen(true)} />
      {closed ? <Text>Closed</Text> : null}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        onClosed={() => setClosed(true)}
        label="Answer the Agent"
        dismissible={props.dismissible}
      >
        <Text>The Agent asks which branch to use.</Text>
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
    beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Answer' }));
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
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.tablet),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Answer' }));
    await body.findByRole('dialog', answerSheet);
    const backdrop = document.elementFromPoint(4, 4);
    if (!backdrop) throw new Error('Nothing is drawn at the window corner.');
    await userEvent.click(backdrop);
    await userEvent.keyboard('{Escape}');
    await expect(body.getByRole('dialog', answerSheet)).toBeVisible();
    await expect(canvas.queryByText('Closed')).toBeNull();
  },
};
