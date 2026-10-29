import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { iconNames } from '#kit/symbols/icon-names';
import { MenuTrigger } from './menu-trigger';
import {
  dangerMenuTrigger,
  defaultMenuTrigger,
  disabledMenuTrigger,
  iconOnlyMenuTrigger,
  leadingMenuTrigger,
  mutedMenuTrigger,
  noIconMenuTrigger,
} from './menu-trigger-fixtures';

const meta = {
  title: 'Design System/Primitives/Overlays/MenuTrigger',
  component: MenuTrigger,
  // No Contracts schema: the props MenuTriggerProps declares.
  argTypes: {
    label: { control: 'text' },
    detail: { control: 'text' },
    icon: { control: 'select', options: iconNames },
    leading: { control: false },
    trailing: { control: false },
    tone: { control: 'select', options: ['muted', 'danger'] },
    iconOnly: { control: 'boolean' },
    disabled: { control: 'boolean' },
    accessibilityLabel: { control: 'text' },
    testID: { control: 'text' },
  },
} satisfies Meta<typeof MenuTrigger>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: defaultMenuTrigger };

export const Muted: Story = { args: mutedMenuTrigger };

export const Danger: Story = { args: dangerMenuTrigger };

export const NoIcon: Story = { args: noIconMenuTrigger };

export const Disabled: Story = { args: disabledMenuTrigger };

export const IconOnly: Story = { args: iconOnlyMenuTrigger };

export const Leading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Drawn in the icon’s place, where no symbol fits.',
      },
    },
  },
  args: leadingMenuTrigger,
};
