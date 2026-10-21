import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { iconNames } from '#kit/symbols/icon-names';
import { textRoles } from '#primitives/content/text';
import { Spinner } from '#primitives/status/spinner';
import { MenuTrigger } from './menu-trigger';

const meta = {
  title: 'Design System/Primitives/Overlays/MenuTrigger',
  component: MenuTrigger,
  args: { label: 'Item' },
  // No Contracts schema: the props MenuTriggerProps declares.
  argTypes: {
    label: { control: 'text' },
    labelRole: { control: 'select', options: textRoles },
    icon: { control: 'select', options: iconNames },
    leading: { control: false },
    trailing: { control: false },
    tone: { control: 'select', options: ['muted', 'danger'] },
    iconOnly: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md'] },
    disabled: { control: 'boolean' },
    accessibilityLabel: { control: 'text' },
    testID: { control: 'text' },
  },
} satisfies Meta<typeof MenuTrigger>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { icon: 'folder' } };

export const Muted: Story = {
  args: { label: 'Muted', icon: 'branch', tone: 'muted' },
};

export const Danger: Story = {
  args: { label: 'Danger', icon: 'private', tone: 'danger' },
};

export const NoIcon: Story = { args: { label: 'No icon', tone: 'muted' } };

export const Disabled: Story = {
  args: { label: 'Disabled', icon: 'folder', tone: 'muted', disabled: true },
};

export const IconOnly: Story = {
  args: { label: 'Options', icon: 'plan-mode', iconOnly: true },
};

export const Leading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Drawn in the icon’s place, where no symbol fits.',
      },
    },
  },
  args: { label: 'Label', leading: <Spinner accessibilityLabel="Loading" /> },
};
