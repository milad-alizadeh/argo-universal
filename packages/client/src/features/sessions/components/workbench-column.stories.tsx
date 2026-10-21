import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { severalPullRequests } from './session-pull-request.mocks';
import { runningShells } from './shell-list/shell-list-fixtures';
import { severalMixedSubagents } from './subagent-list/subagent-list-fixtures';
import { WorkbenchColumn } from './workbench-column';

// Paper 24JC-0: Components / WorkbenchColumn at its product width.
const meta = {
  title: 'Sessions/WorkbenchColumn',
  component: WorkbenchColumn,
  parameters: { screenPreview: true },
  decorators: [
    (Story): ReactElement => (
      <View className="m-4 w-frame-list">
        <Story />
      </View>
    ),
  ],
  argTypes: {
    panels: {
      control: false,
      description:
        'What the Session offers: which sections, their counts, the Changes preview and the Agents summary.',
    },
  },
  args: {
    panels: {
      offered: ['changes', 'subagents', 'shells'],
      counts: {
        changes: severalPullRequests.length,
        subagents: severalMixedSubagents.subagents.length,
        shells: runningShells.shells.length,
      },
      pullRequests: severalPullRequests,
      changesSummary: { files: 11, additions: 267, deletions: 61 },
      agents: severalMixedSubagents,
      onSelect: fn(),
      onToggle: fn(),
      onOpenChanges: fn(),
    },
  },
} satisfies Meta<typeof WorkbenchColumn>;

export default meta;

type Story = StoryObj<typeof meta>;

// Every section the Session offers: Changes, Agents and Shells, each on its own card.
export const AllSections: Story = {};
