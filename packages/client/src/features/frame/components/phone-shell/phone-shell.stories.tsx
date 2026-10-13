import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { sectionOrder } from '../shell-sections';
import { PhoneShellFrame } from './phone-shell-frame.mocks';

const meta = {
  title: 'Shell/PhoneShell',
  component: PhoneShellFrame,
  parameters: { screenPreview: true },
  argTypes: {
    selectedSection: {
      control: 'select',
      options: [...sectionOrder],
    },
    attentionCount: { control: 'number' },
    drawerOpen: { control: 'boolean' },
  },
  render: (args): React.JSX.Element => <PhoneShellFrame {...args} />,
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    drawerOpen: false,
    onDrawerOpenChange: action('drawer open changed'),
    onSectionChange: action('section changed'),
    onSearch: action('search'),
    onFilter: action('filter'),
  },
} satisfies Meta<typeof PhoneShellFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

// Controls set the drawer and section; product controls report their callbacks.
export const Overview: Story = { name: 'PhoneShell' };

// Paper's "SessionsScreen (phone) / Drawer open": the glass drawer over its warm glow.
export const DrawerOpen: Story = { args: { drawerOpen: true } };
