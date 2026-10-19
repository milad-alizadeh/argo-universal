import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
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

const chooseTheme = fn();

export const PickerKeyboardSelection: StoryObj<typeof meta> = {
  render: () => (
    <ListItem.Picker
      title="Theme"
      value="system"
      options={[
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
      ]}
      onValueChange={chooseTheme}
    />
  ),
  beforeEach: () => {
    chooseTheme.mockClear();
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleViewport(1440);
    await userEvent.tab();
    await expect(
      canvas.getByRole('button', { name: 'Theme, System' }),
    ).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const page = within(canvasElement.ownerDocument.body);
    await expect(
      await page.findByRole('menuitemradio', { name: 'System' }),
    ).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(chooseTheme).toHaveBeenCalledWith('light');
    await expect(chooseTheme).toHaveBeenCalledOnce();
  },
};

// Desktop and web draw a row's description inside its row, once, with no footer under the section.
const fastModeDescription = "Use the Agent's faster model when it offers one.";

export const DescriptionSitsInItsRow: StoryObj<typeof meta> = {
  render: Settings.render,
  play: async ({ canvas }) => {
    await settleViewport(1440);
    const row = await canvas.findByRole('switch', { name: 'Fast mode' });
    await expect(within(row).getByText(fastModeDescription)).toBeVisible();
    await expect(canvas.getAllByText(fastModeDescription)).toHaveLength(1);
  },
};
