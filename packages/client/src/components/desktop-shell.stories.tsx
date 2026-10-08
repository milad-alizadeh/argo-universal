import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { DesktopShellFrame } from '../../mocks/desktop-shell-frame';
import { InspectorFilesMock } from '../../mocks/inspector-files-mock';
import { DesktopShell, type DesktopShellProps } from './desktop-shell';

const meta = {
  title: 'Shell/DesktopShell',
  component: DesktopShell,
  parameters: { screenPreview: true },
  argTypes: {
    selectedSection: {
      control: 'select',
      options: ['sessions', 'issues', 'atlas', 'settings'],
    },
    inspectorState: {
      control: 'select',
      options: ['closed', 'open', 'expanded'],
    },
    sidebarShown: { control: 'boolean' },
    attentionCount: { control: 'number' },
  },
  render: (args): React.JSX.Element => <DesktopShellFrame {...args} />,
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    sidebarShown: true,
    inspectorState: 'closed',
    listHeader: null,
    list: null,
    detailHeader: null,
    children: null,
    inspectorHeader: null,
    inspector: null,
    onSectionChange: action('section changed'),
    onSidebarShownChange: action('sidebar changed'),
    onInspectorStateChange: action('Inspector changed'),
  },
} satisfies Meta<DesktopShellProps>;

export default meta;
type Story = StoryObj<typeof meta>;

// Callbacks report rail and divider changes; controls set the displayed shell props.
export const Overview: Story = { name: 'DesktopShell' };

// Changed files in the Inspector: one list of file headers and lines that fades under the toolbar.
export const InspectorFiles: Story = {
  name: 'Inspector files',
  args: { inspectorState: 'open' },
  // An element in args holds React internals, which Storybook walks as a cyclic arg until the native catalog hangs.
  render: (args) => (
    <DesktopShellFrame {...args} inspector={<InspectorFilesMock />} />
  ),
};
