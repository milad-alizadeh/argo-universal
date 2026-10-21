import { Inspector } from '@repo/kit/primitives/scaffolds/inspector';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { sectionOrder } from '../../../lib/product/navigation/sections';
import { InspectorFilesMock } from './inspector-files.mocks';
import {
  collapsedSidebarScaffold,
  mediumScaffold,
  openInspectorScaffold,
  wideScaffold,
} from './scaffold-fixtures';
import { ScaffoldMock, type ScaffoldMockProps } from './scaffold.mocks';

const meta = {
  title: 'Frame/Scaffold',
  component: ScaffoldMock,
  parameters: { screenPreview: true },
  argTypes: {
    sizeClass: {
      control: 'select',
      options: ['compact', 'medium', 'wide'],
    },
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
    inspector: { control: false },
    band: { control: false },
    children: { control: false },
    onSectionChange: { control: false },
    onSidebarShownChange: { control: false },
    onInspectorStateChange: { control: false },
  },
  render: (args): React.JSX.Element => <ScaffoldMock {...args} />,
  args: {
    ...wideScaffold,
    onSectionChange: action('section changed'),
    onSidebarShownChange: action('sidebar changed'),
    onInspectorStateChange: action('Inspector changed'),
  },
} satisfies Meta<ScaffoldMockProps>;

export default meta;

type Story = StoryObj<typeof meta>;

// The rail, the sidebar's list and the page; callbacks report rail and divider changes.
export const Wide: Story = { args: wideScaffold };

// Paper's "Rail B · collapsed": only the rail stays on the glass, on the window surface.
export const SidebarHidden: Story = {
  name: 'Sidebar hidden',
  args: collapsedSidebarScaffold,
};

// Changed files in the Inspector: one list of file headers and lines that fades under the toolbar.
export const InspectorFiles: Story = {
  name: 'Inspector files',
  args: openInspectorScaffold,
  // An element in args holds React internals, which Storybook walks as a cyclic arg until the native catalog hangs.
  render: (args) => (
    <ScaffoldMock {...args} inspector={<InspectorFilesMock />} />
  ),
};

// A medium window takes the phone shell (ADR-0026): the page fills the window and the page's Inspector rises as a sheet over it.
export const MediumInspector: Story = {
  name: 'Medium Inspector',
  args: mediumScaffold,
  render: (args) => (
    <>
      <ScaffoldMock {...args} />
      <Inspector open title="Changes" onOpenChange={action('onOpenChange')}>
        <InspectorFilesMock />
      </Inspector>
    </>
  ),
};
