import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { ChangesInspector } from './changes-inspector';
import {
  aFewChanges,
  changesAgainstABranch,
  expandedChanges,
  loadingChanges,
  manyChanges,
  noChanges,
  noUncommittedChanges,
  unloadableChanges,
} from './changes-inspector-fixtures';
import { PagedChangesInspector } from './changes-inspector-paging.mocks';
import {
  ChangesInspectorSheet,
  fewFiles,
  manyFiles,
} from './changes-inspector.mocks';

// Paper: Feed & Inspector, Session Explorations, Flow / Changes comparison (owner, 2026-10-19).
const meta = {
  title: 'Frame/ChangesInspector',
  component: ChangesInspector,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="h-175 w-full">
        <Story />
      </View>
    ),
  ],
  /*
   * The Changes props are declared in changes-view-props.ts and the Inspector's in the kit, neither
   * of which react-docgen can follow (docs/agents/storybook.md, "Docgen"), so the descriptions live here.
   */
  argTypes: {
    comparison: {
      control: false,
      description: 'What the Checkout is compared with.',
    },
    mainBranch: {
      control: 'text',
      description: "The branch the Project's main checkout has checked out.",
    },
    branches: {
      control: false,
      description: 'The branches Compare Against offers.',
    },
    files: {
      control: false,
      description:
        'Undefined until the first load for this comparison settles.',
    },
    viewed: { control: false, description: 'The paths marked Viewed.' },
    summary: {
      control: false,
      description:
        "The whole comparison's counts, including files no page has brought yet.",
    },
    moreFiles: {
      control: 'boolean',
      description: 'More files wait on the Server.',
    },
    diffs: {
      control: false,
      description: "Each opened file's diff, a page of lines at a time.",
    },
    loadError: {
      control: 'text',
      description:
        'The last load failed; files from an earlier load stay on screen.',
    },
    expanded: {
      control: 'boolean',
      description: 'The Inspector fills the page at the Stage’s width.',
    },
    inSheet: {
      control: 'boolean',
      description: 'The Inspector draws inside a sheet, not a pane.',
    },
    onComparisonChange: { control: false },
    onViewedChange: { control: false },
    onLoadMoreFiles: { control: false },
    onLoadDiff: { control: false },
    onExpandedChange: { control: false },
    onOpenChange: { control: false },
  },
  args: {
    ...aFewChanges,
    onComparisonChange: action('comparison changed'),
    onViewedChange: action('Viewed changed'),
    onLoadDiff: action('diff pages asked for'),
    onExpandedChange: action('expanded changed'),
    onOpenChange: action('open changed'),
  },
} satisfies Meta<typeof ChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AFewFiles: Story = { args: aFewChanges };

export const ManyFiles: Story = { args: manyChanges };

export const NoChanges: Story = { args: noChanges };

export const NoUncommittedChanges: Story = { args: noUncommittedChanges };

export const ComparedAgainstABranch: Story = { args: changesAgainstABranch };

export const Loading: Story = { args: loadingChanges };

export const CouldNotLoad: Story = { args: unloadableChanges };

export const Expanded: Story = { args: expandedChanges };

// The phone shell's Inspector sheet.
export const InASheet: Story = {
  render: (args) => <ChangesInspectorSheet {...args} />,
};

// The Server's pages: fifty files at a time, and each opened diff in pages of lines, as the list scrolls to them.
export const Paged: Story = {
  render: (args) => (
    <PagedChangesInspector {...args} source={[...fewFiles, ...manyFiles]} />
  ),
};
