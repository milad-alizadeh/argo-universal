import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import {
  type SessionBarProps,
  SessionWorkbenchColumn,
  useSessionPanels,
} from '#features/sessions';
import {
  busyPullRequest,
  severalPullRequests,
} from '../../../../features/sessions/components/session-pull-request.mocks';
import {
  sessionShells,
  shellNow,
} from '../../../../features/sessions/components/shell-list/shell-list.mocks';
import {
  subagentNow,
  subagentStates,
} from '../../../../features/sessions/components/subagent-list/subagent-list.mocks';
import { attachedIssuesBar } from '../session-detail-view-bar.mocks';
import { SessionInspector } from '../session-inspector';
import type { SessionInspectorContent } from '../session-inspector-content';
import { runActions } from '../session-run-inspector-fixtures';
import { coverageCard, issueTrackerCard } from './plugin-card.mocks';
import { itemsOf } from './session-section';
import { offeredSections, sessionWorkbench } from './session-sections';
import {
  detachableLine,
  onlyDoneSections,
  summaryLines,
} from './session-sections-fixtures';

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
  bar,
}: {
  content: SessionInspectorContent;
  bar?: SessionBarProps;
}): ReactElement {
  const panels = useSessionPanels(
    offeredSections(itemsOf(content), content.pluginCards),
  );

  return (
    <View className="m-4 w-frame-list">
      <SessionWorkbenchColumn
        sections={sessionWorkbench(content, panels, bar).sections}
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
    bar: {
      control: false,
      description:
        "The Plugins' Session bar lines, each drawn as its own card.",
    },
  },
  args: { content: everySection },
} satisfies Meta<typeof SectionsWorkbench>;

export default meta;

type Story = StoryObj<typeof meta>;

// Every Section a Session offers: Changes, Agents and Shells, each on its own card with only its title, chevron and handle on the title line.
export const AllSections: Story = {};

const includingRuns = { ...everySection, runs: runActions };

export const Runs: Story = { args: { content: includingRuns } };

// One pull request with a long title, 15 files and 10/23 checks: the number and diff total stay on the second line, the checks at its trailing edge.
export const BusyPullRequest: Story = {
  args: {
    content: {
      header: { ...everySection.header, pullRequests: [busyPullRequest] },
    },
  },
};

// Two Plugins' cards, stacked after Argo's own in the order the Slot gives them (ADR-0035).
export const PluginCards: Story = {
  args: {
    content: { ...everySection, pluginCards: [issueTrackerCard, coverageCard] },
  },
};

// One-line cards: a diff total, finished Agents and an Issue's line each draw one summary line, at one height.
export const SummaryLines: Story = {
  args: {
    content: {
      header: { ...everySection.header, pullRequests: [] },
      subagents: { subagents: subagentStates.allFinished, now: subagentNow },
    },
    bar: { shown: summaryLines, hidden: [], onOpen: fn() },
  },
};

// A pull request row, finished Agents and an Issue's line: their leading marks share one slot, so their text starts on one edge.
export const LeadingMarks: Story = {
  args: {
    content: {
      header: everySection.header,
      subagents: { subagents: subagentStates.allFinished, now: subagentNow },
    },
    bar: { shown: summaryLines, hidden: [], onOpen: fn() },
  },
};

// Two attached Issues share one card, each a row; the Plugin sent no `detach`, so the rows have no menu.
export const AttachedIssues: Story = {
  args: {
    content: { header: { ...everySection.header, pullRequests: [] } },
    bar: attachedIssuesBar,
  },
};

// One attached Issue the Session can detach: its card lists the line as a row with its "…", as tall as that row.
export const DetachableLine: Story = {
  args: {
    content: {
      header: { ...everySection.header, pullRequests: [] },
      subagents: { subagents: [], now: subagentNow },
    },
    bar: { shown: detachableLine, hidden: [], onOpen: fn(), onDetach: fn() },
  },
};

// Cards with nothing live: each "N done" line is a row of its card, at a row's avatar size, type and height.
export const OnlyDone: Story = {
  args: {
    content: {
      header: { ...everySection.header, pullRequests: [] },
      ...onlyDoneSections,
    },
  },
};

export const CreatePullRequest: Story = {
  args: {
    content: {
      header: { ...everySection.header, pullRequests: [] },
      createPullRequest: { onPress: fn(), disabled: false },
    },
  },
};

export const Schedules: Story = {
  args: {
    content: {
      ...everySection,
      schedules: {
        disabled: false,
        manage: fn(),
        items: [
          {
            id: 'build',
            sessionId: 'session',
            intervalSeconds: 300,
            paused: false,
            lastQueuedAt: 0,
            nextAt: 300000,
            prompt: [{ type: 'text', text: 'Check open pull requests' }],
          },
          {
            id: 'nightly',
            sessionId: 'session',
            intervalSeconds: 3600,
            paused: true,
            lastQueuedAt: 0,
            nextAt: 3600000,
            prompt: [{ type: 'text', text: 'Check the nightly build' }],
          },
        ],
      },
    },
  },
};

function OpenSchedules({
  content,
}: {
  content: SessionInspectorContent;
}): ReactElement {
  const panels = useSessionPanels(['schedules']);
  const [opened, setOpened] = useState(false);

  if (!opened) {
    panels.select('schedules');
    setOpened(true);
  }

  return (
    <View className="h-full flex-row">
      <SessionInspector {...content} panels={panels} />
    </View>
  );
}

export const SchedulesInspector: Story = {
  args: Schedules.args,
  render: ({ content }) => <OpenSchedules content={content} />,
};
