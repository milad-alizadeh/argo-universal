import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { action } from 'storybook/actions';
import { sessionsLayoutChoices } from '../../stores/sessions-view';
import { SessionRow, type SessionRowProps } from './session-row';
import {
  archivedSession,
  compactSession,
  failedSession,
  idleSession,
  needsInputSession,
  runningSession,
  selectedSession,
  unreadSession,
} from './session-row-fixtures';

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
    subagentsFailed: {
      control: 'boolean',
      description: 'A Subagent of this Session failed.',
    },
    age: {
      control: 'text',
      description:
        'How long ago the Session was last active: it leads a Regular row\u2019s meta line, and ends a Compact row that has no PR.',
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

// The time leads the meta line, the activity reads in the foreground, and a Plan bar fills under the row.
export const Running: Story = { args: runningSession };

// Waiting on you: the activity takes the warning tone.
export const NeedsInput: Story = { args: needsInputSession };

// A failed Session reads red, and its failed Subagents show beside a closed Change.
export const Failed: Story = { args: failedSession };

// Nothing is running: no status dot ends the row, and a finished Plan draws no bar.
export const Idle: Story = { args: idleSession };

// Unread: the title is semibold and the activity is muted.
export const Unread: Story = { args: unreadSession };

// The selected row on a wide layout.
export const Selected: Story = { args: selectedSession };

// An archived Session ends its meta line on the Archived pill.
export const Archived: Story = { args: archivedSession };

// One line per Session: its PR's glyph in the PR's state colour, or with no PR how long ago it was active, then its status dot unless idle.
export const Compact: Story = { args: compactSession };

// The pointer over a row tints it; Regular keeps its hairline. Wide layouts only.
const hover: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.hover(canvas.getByRole('button'));
};

export const Hovered: Story = { args: runningSession, play: hover };

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
  const plan = { done: useSteppingDone(), total: planTotal };

  return <SessionRow {...args} session={{ ...args.session, plan }} />;
}

export const PlanSteps: Story = {
  name: 'Plan steps',
  args: runningSession,
  render: (args) => <SteppingPlanRow {...args} />,
};
