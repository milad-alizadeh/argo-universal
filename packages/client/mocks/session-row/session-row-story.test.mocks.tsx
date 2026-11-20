import { settleLayout } from '@repo/kit/mocks/story-layout';
import { agentsList, sessionRows } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { SessionRow } from '../../src/features/sessions/components/session-row/session-row';

export const meta = {
  title: 'Tests/Sessions/SessionRow',
  component: SessionRow,
  args: {
    session: sessionRows.running,
    logo: agentsList[0]?.icon ?? '',
    onSelect: fn(),
  },
} satisfies Meta<typeof SessionRow>;

export type Story = StoryObj<typeof meta>;

export const dark = { globals: { mode: 'dark' } };

export function running(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleLayout(width);
      await expect(canvas.getByText('Running the tests')).toBeVisible();

      const row = canvas.getByRole('button', {
        name: 'Build the settings screen, Running',
      });

      await expect(args.onSelect).not.toHaveBeenCalled();
      await userEvent.click(row);
      await expect(args.onSelect).toHaveBeenCalledWith('session-running');
    },
  };
}

export function metadata(width: number): Story {
  return {
    render: (args) => (
      <>
        {(['working', 'branch', 'open', 'merged', 'closed'] as const).map(
          (stage) => (
            <SessionRow
              {...args}
              key={stage}
              session={{ ...args.session, title: `${stage} metadata` }}
              pullRequest={{ number: 45, stage }}
            />
          ),
        )}
      </>
    ),
    play: async ({ canvas, userEvent, args }) => {
      await settleLayout(width);

      for (const stage of ['Working', 'Branch', 'Open', 'Merged', 'Closed']) {
        const label = `${stage} Change #45`;

        await expect(canvas.getByLabelText(label)).toBeVisible();
      }

      await expect(canvas.queryByLabelText(/^Issue #/)).not.toBeInTheDocument();
      await expect(args.onSelect).not.toHaveBeenCalled();
      await userEvent.click(
        canvas.getByRole('button', { name: 'open metadata, Running' }),
      );
      await expect(args.onSelect).toHaveBeenCalledWith(args.session.sessionId);
      await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    },
  };
}

export const states = [
  ['needsInput', 'Needs input'],
  ['running', 'Running'],
  ['failed', 'Failed'],
  ['unread', 'Unread'],
  ['idle', 'Idle'],
] satisfies [keyof typeof sessionRows, string][];

const parityRowNames = agentsList.flatMap((agent) =>
  states.map(
    ([name, label]) => `${agent.name}: ${sessionRows[name].title}, ${label}`,
  ),
);

export const statusParity: Story = {
  render: (args) => (
    <>
      {agentsList.flatMap((agent) =>
        states.map(([name]) => {
          const session = sessionRows[name];

          return (
            <SessionRow
              {...args}
              key={`${agent.id}:${name}`}
              logo={agent.icon ?? ''}
              session={{
                ...session,
                title: `${agent.name}: ${session.title}`,
              }}
            />
          );
        }),
      )}
    </>
  ),
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleLayout(width);

      for (const name of parityRowNames) {
        await expect(canvas.getByRole('button', { name })).toBeVisible();
      }
    }
  },
};
