import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { SessionWorkbenchColumn, useSessionPanels } from '#features/sessions';
import { severalPullRequests } from '../../../../features/sessions/components/session-pull-request.mocks';
import {
  sessionShells,
  shellNow,
} from '../../../../features/sessions/components/shell-list/shell-list.mocks';
import {
  subagentNow,
  subagentStates,
} from '../../../../features/sessions/components/subagent-list/subagent-list.mocks';
import type { SessionInspectorContent } from '../session-inspector-content';
import { coverageCard, issueTrackerCard } from './plugin-card.mocks';
import { itemsOf } from './session-section';
import { offeredSections, sessionWorkbench } from './session-sections';

const everySection = {
  header: {
    title: 'Fix login',
    status: 'idle',
    startedAt: null,
    pullRequests: severalPullRequests,
    changes: {
      summary: { files: 11, additions: 267, deletions: 61 },
      open: false,
      onOpenChange: fn(),
    },
  },
  subagents: { subagents: subagentStates.severalMixed, now: subagentNow },
  shells: { shells: sessionShells, now: shellNow, onStop: fn() },
} satisfies SessionInspectorContent;

function SectionsWorkbench({
  content,
}: {
  content: SessionInspectorContent;
}): ReactElement {
  const panels = useSessionPanels(
    offeredSections(itemsOf(content), content.pluginCards),
  );

  return (
    <View className="m-4 w-frame-list">
      <SessionWorkbenchColumn
        sections={sessionWorkbench(content, panels).sections}
      />
    </View>
  );
}

const meta = {
  title: 'Screens/Sessions/Session/Sections',
  component: SectionsWorkbench,
  parameters: { screenPreview: true },
  argTypes: {
    content: {
      control: false,
      description:
        'What the Session has: its pull requests and changed files, its Agents and its Shells.',
    },
  },
  args: { content: everySection },
} satisfies Meta<typeof SectionsWorkbench>;

export default meta;

type Story = StoryObj<typeof meta>;

// Every Section a Session offers: Changes, Agents and Shells, each on its own card with only its title, chevron and handle on the title line.
export const AllSections: Story = {};

// Two Plugins' cards, stacked after Argo's own in the order the Slot gives them (ADR-0035).
export const PluginCards: Story = {
  args: {
    content: { ...everySection, pluginCards: [issueTrackerCard, coverageCard] },
  },
};
