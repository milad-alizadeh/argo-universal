import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { Inspector } from '#primitives/scaffolds/inspector';
import { sectionOrder } from '../../../lib/product/navigation/sections';
import { InspectorFilesMock } from './inspector-files.mocks';
import { ScaffoldMock, type ScaffoldMockProps } from './scaffold.mocks';

const meta = {
  title: 'Frame/Scaffold',
  component: ScaffoldMock,
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
    sizeClass: {
      control: 'select',
      options: ['compact', 'medium', 'wide'],
    },
    sidebarShown: { control: 'boolean' },
    attentionCount: { control: 'number' },
  },
  render: (args): React.JSX.Element => <ScaffoldMock {...args} />,
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    sidebarShown: true,
    inspectorState: 'closed',
    onSectionChange: action('section changed'),
    onSidebarShownChange: action('sidebar changed'),
    onInspectorStateChange: action('Inspector changed'),
  },
} satisfies Meta<ScaffoldMockProps>;

export default meta;

type Story = StoryObj<typeof meta>;

// Callbacks report rail and divider changes; controls set the displayed Scaffold props.
export const Overview: Story = { name: 'Scaffold' };

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
    <ScaffoldMock {...args} inspector={<InspectorFilesMock />} />
  ),
};

// A medium window takes the phone shell (ADR-0026): the page fills the window and the page's Inspector rises as a sheet over it.
export const MediumInspector: Story = {
  name: 'Medium Inspector',
  args: { sizeClass: 'medium' },
  render: (args) => (
    <>
      <ScaffoldMock {...args} />
      <Inspector open title="Changes" onOpenChange={action('onOpenChange')}>
        <InspectorFilesMock />
      </Inspector>
    </>
  ),
};
