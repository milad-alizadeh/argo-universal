import { iconNames } from '@repo/kit/symbols/icon-names';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { WorkbenchCollapsibleTitle } from './workbench-collapsible-title';
import {
  collapsedWorkbenchTitle,
  expandedWorkbenchTitle,
  notCollapsibleWorkbenchTitle,
} from './workbench-collapsible-title-fixtures';

const meta = {
  title: 'Sessions/WorkbenchCollapsibleTitle',
  component: WorkbenchCollapsibleTitle,
  argTypes: {
    icon: { control: 'select', options: iconNames },
    onPress: { control: false },
    summary: { control: false },
  },
  // No `expanded` here: NotCollapsible is the state whose title has none.
  args: { ...notCollapsibleWorkbenchTitle, onPress: fn() },
} satisfies Meta<typeof WorkbenchCollapsibleTitle>;

export default meta;

type Story = StoryObj<typeof meta>;

// Open: the disclosure points down and the card's body shows under the title.
export const Expanded: Story = { args: expandedWorkbenchTitle };

// Closed: the disclosure turns and the title keeps its trailing summary.
export const Collapsed: Story = { args: collapsedWorkbenchTitle };

// A section that cannot collapse draws no disclosure, and pressing the title opens the section.
export const NotCollapsible: Story = { args: notCollapsibleWorkbenchTitle };
