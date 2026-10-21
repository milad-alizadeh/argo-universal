import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { severalPullRequests } from './session-pull-request.mocks';
import { SessionWorkbench } from './session-workbench';
import { sessionShells } from './shell-list/shell-list.mocks';
import {
  subagentNow,
  subagentStates,
} from './subagent-list/subagent-list.mocks';

// Paper / WorkbenchGlass: the Changes, Agents and Shells cards at their product width.
const meta = {
  title: 'Sessions/SessionWorkbench',
  component: SessionWorkbench,
  parameters: { screenPreview: true },
  decorators: [
    (Story): ReactElement => (
      <View className="m-4 w-frame-list">
        <Story />
      </View>
    ),
  ],
  args: {
    panels: {
      offered: ['changes', 'subagents', 'shells'],
      counts: {
        changes: severalPullRequests.length,
        subagents: subagentStates.severalMixed.length,
        shells: sessionShells.length,
      },
      pullRequests: severalPullRequests,
      changesSummary: { files: 11, additions: 267, deletions: 61 },
      agents: { subagents: subagentStates.severalMixed, now: subagentNow },
      onSelect: fn(),
      onToggle: fn(),
      onOpenChanges: fn(),
    },
  },
} satisfies Meta<typeof SessionWorkbench>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'SessionWorkbench' };
