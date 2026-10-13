import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { sectionOrder } from '../shell-sections';
import {
  DesktopShellFrame,
  type DesktopShellFrameProps,
} from './desktop-shell-frame.mocks';
import { InspectorFilesMock } from './inspector-files.mocks';

const meta = {
  title: 'Shell/DesktopShell',
  component: DesktopShellFrame,
  parameters: { screenPreview: true },
  argTypes: {
    selectedSection: {
      control: 'select',
      options: [...sectionOrder],
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
    onSectionChange: action('section changed'),
    onSidebarShownChange: action('sidebar changed'),
    onInspectorStateChange: action('Inspector changed'),
  },
} satisfies Meta<DesktopShellFrameProps>;

export default meta;

type Story = StoryObj<typeof meta>;

// Callbacks report rail and divider changes; controls set the displayed shell props.
export const Overview: Story = { name: 'DesktopShell' };

// Paper's "Window / Sidebar collapsed": only the rail stays on the glass, and the glow shrinks to a hint.
export const SidebarHidden: Story = {
  name: 'Sidebar hidden',
  args: { sidebarShown: false, inspectorState: 'open' },
};

// Changed files in the Inspector: one list of file headers and lines that fades under the toolbar.
export const InspectorFiles: Story = {
  name: 'Inspector files',
  args: { inspectorState: 'open' },
  // An element in args holds React internals, which Storybook walks as a cyclic arg until the native catalog hangs.
  render: (args) => (
    <DesktopShellFrame {...args} inspector={<InspectorFilesMock />} />
  ),
};
