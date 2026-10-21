import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Inspector, type InspectorProps } from './index';
import {
  ExamplePane,
  ExampleTabsPane,
  inspectorTitle,
} from './inspector.mocks';

// Each story draws its own pane; the meta args only satisfy the component's type.
const args: InspectorProps = {
  title: inspectorTitle,
  open: true,
  onOpenChange: () => {},
};

const meta = {
  title: 'Design System/Primitives/Scaffolds/Inspector',
  component: Inspector,
  argTypes: kitArgTypes('Inspector'),
  args,
} satisfies Meta<typeof Inspector>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * Each story keeps its own render: it draws the wide column's pane directly, with the props the
 * host holds rather than the ones Inspector takes. Under wide the same content opens in a Sheet
 * (see Tests/Inspector).
 */
export const Open: Story = { render: () => <ExamplePane /> };

export const Actions: Story = { render: () => <ExamplePane actions /> };

export const Expanded: Story = { render: () => <ExamplePane expanded /> };

// Tabs in place of the title, for an Inspector that shows one of several panels.
export const Tabs: Story = { render: () => <ExampleTabsPane /> };

// The tabs that do not fit scroll behind the faded edge.
export const Overflowing: Story = {
  render: () => <ExampleTabsPane narrow />,
};
