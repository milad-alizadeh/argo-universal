import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../each-layout';
import { settleViewport } from '../settle-viewport';
import { Button } from './button';
import { Menu } from './menu';
import { Text } from './text';

const askLabel = 'Ask before changes';
const defaultLabel = 'Default';
const checkedAttribute = 'aria-checked';

const choices = [
  { value: 'default', label: defaultLabel },
  { value: 'ask', label: askLabel },
  { value: 'full', label: 'Full access' },
] as const;
type Permission = (typeof choices)[number]['value'];

function Permissions({
  onValueChange,
  disabled = false,
}: {
  onValueChange: (value: Permission) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const [value, setValue] = useState<Permission>('default');
  return (
    <Menu
      accessibilityLabel="Permissions"
      choices={choices}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
      trigger={
        <Button>
          <Text>Permissions</Text>
        </Button>
      }
    />
  );
}

const meta = {
  title: 'Tests/Menu',
  component: Permissions,
  args: { onValueChange: fn() },
} satisfies Meta<typeof Permissions>;
export default meta;
type Story = StoryObj<typeof meta>;

function keyboardSelection(width: number): Story {
  return {
    play: async ({ canvas, canvasElement, userEvent, args }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      const trigger = canvas.getByRole('button', { name: 'Permissions' });
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const first = await page.findByRole('menuitemradio', {
        name: defaultLabel,
      });
      await expect(first).toHaveAttribute(checkedAttribute, 'true');
      await waitFor(() => expect(first).toHaveFocus());
      await userEvent.keyboard('{ArrowDown}');
      await expect(
        page.getByRole('menuitemradio', { name: askLabel }),
      ).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(args.onValueChange).toHaveBeenCalledTimes(1);
      await expect(args.onValueChange).toHaveBeenCalledWith('ask');
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
      await expect(trigger).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(
        await page.findByRole('menuitemradio', { name: askLabel }),
      ).toHaveAttribute(checkedAttribute, 'true');
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(trigger).toHaveFocus());
      await expect(args.onValueChange).toHaveBeenCalledTimes(1);
      await userEvent.keyboard('{ArrowDown}');
      await page.findByRole('menuitemradio', { name: defaultLabel });
      await userEvent.keyboard('full');
      await waitFor(() =>
        expect(
          page.getByRole('menuitemradio', { name: 'Full access' }),
        ).toHaveFocus(),
      );
      await userEvent.keyboard(' ');
      await expect(args.onValueChange).toHaveBeenCalledTimes(2);
      await expect(args.onValueChange).toHaveBeenLastCalledWith('full');
      await waitFor(() => expect(trigger).toHaveFocus());
    },
  };
}

export const KeyboardSelectionWide = keyboardSelection(layoutWidths.wide);
export const KeyboardSelectionPhone = keyboardSelection(layoutWidths.phone);

function pointerSelection(width: number): Story {
  return {
    play: async ({ canvas, canvasElement, userEvent, args }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      const trigger = canvas.getByRole('button', { name: 'Permissions' });
      await userEvent.click(trigger);
      await userEvent.click(
        await page.findByRole('menuitemradio', { name: askLabel }),
      );
      await expect(args.onValueChange).toHaveBeenCalledTimes(1);
      await expect(args.onValueChange).toHaveBeenCalledWith('ask');
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
      await userEvent.click(trigger);
      await expect(
        await page.findByRole('menuitemradio', { name: askLabel }),
      ).toHaveAttribute(checkedAttribute, 'true');
      await userEvent.keyboard('{Escape}');
    },
  };
}

function disabledTrigger(width: number): Story {
  return {
    args: { disabled: true },
    play: async ({ canvas, canvasElement, userEvent, args }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      const trigger = canvas.getByRole('button', { name: 'Permissions' });
      await expect(trigger).toBeDisabled();
      await userEvent.tab();
      await expect(trigger).not.toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(page.queryByRole('menu')).not.toBeInTheDocument();
      await expect(args.onValueChange).not.toHaveBeenCalled();
    },
  };
}

export const PointerSelectionWide = pointerSelection(layoutWidths.wide);
export const PointerSelectionPhone = pointerSelection(layoutWidths.phone);
export const DisabledWide = disabledTrigger(layoutWidths.wide);
export const DisabledPhone = disabledTrigger(layoutWidths.phone);
