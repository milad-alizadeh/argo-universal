import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { PhoneShellMock } from '../../mocks/phone-shell-mock';
import { PhoneShell } from './PhoneShell';

const meta = {
  title: 'Shell/PhoneShell',
  component: PhoneShell,
  parameters: { screenPreview: true },
  argTypes: {
    selectedSection: {
      control: 'select',
      options: ['sessions', 'issues', 'atlas', 'settings'],
    },
    attentionCount: { control: 'number' },
    drawerOpen: { control: 'boolean' },
  },
  render: (args) => <PhoneShellMock {...args} />,
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    drawerOpen: false,
    children: null,
    onDrawerOpenChange: action('drawer open changed'),
    onSectionChange: action('section changed'),
    onSearch: action('search'),
    onFilter: action('filter'),
  },
} satisfies Meta<typeof PhoneShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// The menu button opens the drawer; controls set the section, attention count and drawer.
export const Overview: Story = { name: 'PhoneShell' };
