import { List } from '@repo/kit/primitives/lists/list';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { sessionsLayoutChoices } from '../../stores/sessions-view';
import { SessionRow, type SessionRowProps } from './session-row';
import {
  type SessionRowCall,
  SessionRowCallProvider,
} from './session-row-call';
import {
  connectingVoiceCall,
  mutedVoiceCall,
  voiceCall,
} from './session-row-call-fixtures';
import {
  archivedSession,
  compactSession,
  failedSession,
  idleSession,
  longPluginItemsCompactSession,
  needsInputSession,
  pluginActivitySession,
  pluginItemsCompactSession,
  pluginItemsSession,
  runningSession,
  selectedSession,
  unreadSession,
} from './session-row-fixtures';
import {
  crowdedMetaSession,
  pullRequestItemsSession,
} from './session-row-pull-request-fixtures';
import {
  backgroundWorkSession,
  todosLeftSession,
} from './session-row-todos-fixtures';

const meta = {
  title: 'Sessions/SessionRow',
  component: SessionRow,
  parameters: { previewPadding: false },
  /*
   * SessionRowProps is declared in session-row-props.ts, which react-docgen cannot follow
   * (docs/agents/storybook.md, "Docgen"), so the descriptions live here with the prop domain.
   */
  argTypes: {
    layout: {
      control: 'select',
      options: sessionsLayoutChoices.map(({ value }) => value),
      description:
        'Regular: the activity, metadata and Plan bar. Compact: one line.',
    },
    selected: {
      control: 'boolean',
      description:
        'The open Session, on a layout wide enough to show a selection.',
    },
    age: {
      control: 'text',
      description:
        'How long ago the Session was last active: it ends a quiet Session\u2019s title line, and a Compact row that has no PR.',
    },
    session: { control: false, description: 'The Session the row draws.' },
    pullRequest: {
      control: false,
      description: 'The Change this Session opened, drawn as its stage glyph.',
    },
  },
  args: { ...runningSession, onSelect: action('select Session') },
} satisfies Meta<typeof SessionRow>;

export default meta;

type Story = StoryObj<typeof meta>;

// A working Session shows no time, the activity reads in the foreground, and one segment per plan step runs under the row.
export const Running: Story = {
  args: runningSession,
  play: async ({ canvas, userEvent }) => {
    await userEvent.unhover(canvas.getByRole('button'));
  },
};

// The last plan step underway: three solid segments and a pale one that glints, never a full bar.
export const LastTodoUnderway: Story = {
  args: {
    ...runningSession,
    session: {
      ...runningSession.session,
      plan: { done: 3, inProgress: 1, total: 4 },
    },
  },
};

// Waiting on you: the time ends the title line, and the activity takes the warning tone.
export const NeedsInput: Story = { args: needsInputSession };

// A failed Session reads red, and its failed Subagents show beside a closed Change.
export const Failed: Story = { args: failedSession };

// Nothing is running: no status dot ends the row, and a finished Plan draws no bar.
export const Idle: Story = { args: idleSession };

// The Turn ended with Todos left and nothing running: no status dot, and the bar is muted.
export const TodosLeft: Story = { args: todosLeftSession };

// The Turn ended but a Background Task still runs: no status dot, the count keeps its own, and the bar stays green.
export const BackgroundWork: Story = { args: backgroundWorkSession };

// Unread: the title is semibold and the activity is muted.
export const Unread: Story = { args: unreadSession };

// The selected row on a wide layout.
export const Selected: Story = { args: selectedSession };

// An archived Session ends its meta line on the Archived pill.
export const Archived: Story = { args: archivedSession };

const onCall =
  (call: SessionRowCall) =>
  (Row: React.ComponentType): React.JSX.Element => (
    <SessionRowCallProvider value={call}>
      <Row />
    </SessionRowCallProvider>
  );

// A Voice call is attached: the bars and the call's time take the status's place at the end of the title line.
export const OnVoiceCall: Story = {
  args: idleSession,
  decorators: [onCall(voiceCall)],
};

// The call is still connecting: the bars show without a time until it connects.
export const VoiceCallConnecting: Story = {
  args: idleSession,
  decorators: [onCall(connectingVoiceCall)],
};

// The call's microphone is muted: mic.slash and "Muted" in red in the same place.
export const VoiceCallMuted: Story = {
  args: idleSession,
  decorators: [onCall(mutedVoiceCall)],
};

/*
 * One line per Session: its PR's glyph in the PR's state colour, or with no PR how long ago it was active, then its
 * status dot unless idle. The line is the compact List's (its `density`), so the row sits in one, as the Sessions list
 * draws it, at the Sessions list's width.
 */
export const Compact: Story = {
  args: compactSession,
  parameters: { screenPreview: true },
  decorators: [
    (Row) => (
      <View className="flex-1 wide:w-frame-list">
        <List appearance="plain" density="compact">
          <Row />
        </List>
      </View>
    ),
  ],
};

const openPluginPage = action('open Plugin page');

// Plugin items follow Argo's own on the meta line, each with its icon and tone; "+2" lists the rest by Plugin.
export const PluginItems: Story = {
  args: { ...pluginItemsSession, onOpenPluginPage: openPluginPage },
};

// A pull request item draws the Change stage mark and tone the Workbench draws, not its Plugin's glyph.
export const PullRequestItems: Story = { args: pullRequestItemsSession };

// A sidebar row just too narrow for every item: Argo's that do not fit beside the Plugin items join "+N" whole.
const crowdedMetaWidth = 280;

export const CrowdedMeta: Story = {
  args: crowdedMetaSession,
  decorators: [
    (Row) => (
      <View style={{ width: crowdedMetaWidth }}>
        <Row />
      </View>
    ),
  ],
};

// The chosen Plugin writes the Activity line in place of Argo's.
export const PluginActivity: Story = { args: pluginActivitySession };

// A Compact row draws one Plugin item after its own detail, the rest behind "+N", then the status dot.
export const PluginItemsCompact: Story = {
  ...Compact,
  args: { ...pluginItemsCompactSession, onOpenPluginPage: openPluginPage },
};

// Long items never squeeze a Compact row's title: the one item truncates.
export const LongPluginItemsCompact: Story = {
  ...Compact,
  args: { ...longPluginItemsCompactSession, onOpenPluginPage: openPluginPage },
};

// A checkpoint every 1.5 seconds: the fill springs from 1 to 2 to 3 of 4 done, then starts over.
const checkpointMilliseconds = 1500;

const planTotal = 4;

const nextDone = (done: number): number => (done % (planTotal - 1)) + 1;

function useSteppingDone(): number {
  const [done, setDone] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => setDone(nextDone), checkpointMilliseconds);

    return (): void => clearInterval(timer);
  }, []);

  return done;
}

function SteppingPlanRow(args: SessionRowProps): React.JSX.Element {
  const done = useSteppingDone();
  // The next step is always underway, so its segment glints while the Session runs.
  const plan = { done, inProgress: done < planTotal ? 1 : 0, total: planTotal };

  return <SessionRow {...args} session={{ ...args.session, plan }} />;
}

export const TodoSteps: Story = {
  name: 'Plan steps',
  args: runningSession,
  render: (args) => <SteppingPlanRow {...args} />,
};
