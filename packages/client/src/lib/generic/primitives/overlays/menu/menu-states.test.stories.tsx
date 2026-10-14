import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Menu } from './menu';

const loadingLabel = 'Loading options…';

const fullLabel = 'Full access';

const askLabel = 'Ask before changes';

// Full access is shown but cannot be chosen yet.
const options = [
  { value: 'default', label: 'Default' },
  { value: 'ask', label: askLabel },
  { value: 'full', label: fullLabel, disabled: true },
] as const;

type Permission = (typeof options)[number]['value'];

type AccessProps = {
  onValueChange: (value: Permission) => void;
  loading?: boolean;
};

function Access(props: AccessProps): React.JSX.Element {
  const [value, setValue] = useState<Permission>('default');

  return (
    <Menu
      accessibilityLabel="Access"
      trigger="Access"
      options={options}
      value={value}
      loading={props.loading}
      onValueChange={(next) => {
        setValue(next);
        props.onValueChange(next);
      }}
    />
  );
}

const meta = {
  title: 'Tests/Menu/States',
  component: Access,
  args: { onValueChange: fn() },
} satisfies Meta<typeof Access>;

export default meta;

type Story = StoryObj<typeof meta>;

// An unavailable option is shown, but keyboard focus skips it and the value stays as it was.
function unavailableOption(width: number): Story {
  return {
    play: async ({ canvas, canvasElement, userEvent, args }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      await userEvent.click(canvas.getByRole('button', { name: 'Access' }));
      const full = await page.findByRole('menuitemradio', { name: fullLabel });
      await expect(full).toHaveAttribute('aria-disabled', 'true');
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
      await expect(full).not.toHaveFocus();
      await userEvent.click(
        page.getByRole('menuitemradio', { name: askLabel }),
      );
      await expect(args.onValueChange).toHaveBeenCalledTimes(1);
      await expect(args.onValueChange).toHaveBeenCalledWith('ask');
    },
  };
}

export const UnavailableOptionWide = unavailableOption(layoutWidths.wide);

export const UnavailableOptionPhone = unavailableOption(layoutWidths.phone);

// While its options load, the menu opens to a progress row and offers nothing to choose.
function loadingOptions(width: number): Story {
  return {
    args: { loading: true },
    play: async ({ canvas, canvasElement, userEvent, args }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      await userEvent.click(canvas.getByRole('button', { name: 'Access' }));
      const menu = await page.findByRole('menu');
      await expect(
        within(menu).getByRole('progressbar', { name: loadingLabel }),
      ).toBeVisible();
      await expect(within(menu).getByText(loadingLabel)).toBeVisible();
      await expect(page.queryByRole('menuitemradio')).not.toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      await expect(args.onValueChange).not.toHaveBeenCalled();
    },
  };
}

export const LoadingOptionsWide = loadingOptions(layoutWidths.wide);

export const LoadingOptionsPhone = loadingOptions(layoutWidths.phone);
