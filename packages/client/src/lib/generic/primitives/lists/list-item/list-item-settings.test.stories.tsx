import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, within } from 'storybook/test';
import { settleViewport } from '../../../settle-viewport';
import { ListItem } from './index';
import { Settings } from './list-item-settings.stories';

const meta = {
  title: 'Tests/Design System/Primitives/ListItem/Settings',
  component: ListItem,
  args: { title: 'Settings' },
  parameters: { screenPreview: true },
} satisfies Meta<typeof ListItem>;

export default meta;

export const PickerChoosesFromWholeRow: StoryObj<typeof meta> = {
  render: Settings.render,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleViewport(1440);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Theme, System' }),
    );
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await page.findByRole('menuitemradio', { name: 'Light' }),
    );
    await expect(canvas.getByText('Light')).toBeVisible();
  },
};

export const StepperUpdatesValue: StoryObj<typeof meta> = {
  render: Settings.render,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(1440);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Increase Max Sessions' }),
    );
    await expect(canvas.getByText('5')).toBeVisible();
  },
};

export const FieldIsEditable: StoryObj<typeof meta> = {
  render: Settings.render,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(1440);
    const name = await canvas.findByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Changed');
    await expect(name).toHaveValue('Changed');
  },
};
