import { agentsList, sessionRows } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { page } from 'vitest/browser';
import { SessionRow } from '../../src/features/sessions/components/session-row/session-row';
import { settleViewport } from '../../src/lib/generic/settle-viewport';

export const meta = {
  title: 'Tests/SessionRow',
  component: SessionRow,
  args: {
    session: sessionRows.running,
    logo: agentsList[0]?.logo ?? '',
    onSelect: fn(),
  },
} satisfies Meta<typeof SessionRow>;

export type Story = StoryObj<typeof meta>;

export const dark = { globals: { mode: 'dark' } };

export function running(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
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
        {(['open', 'draft', 'merged', 'conflict', 'closed'] as const).map(
          (status) => (
            <SessionRow
              {...args}
              key={status}
              session={{ ...args.session, title: `${status} metadata` }}
              issue={{ number: 128 }}
              pullRequest={{ number: 45, status }}
            />
          ),
        )}
      </>
    ),
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);

      for (const status of ['open', 'draft', 'merged', 'conflict', 'closed']) {
        await expect(canvas.getByLabelText(`${status} PR #45`)).toBeVisible();
      }

      await expect(canvas.getAllByLabelText('Issue #128')).toHaveLength(5);
      await expect(args.onSelect).not.toHaveBeenCalled();
      await userEvent.click(
        canvas.getByRole('button', { name: 'open metadata, Running' }),
      );
      await expect(args.onSelect).toHaveBeenCalledWith(args.session.sessionId);
      await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    },
  };
}

const states = [
  ['needsInput', 'Needs input'],
  ['running', 'Running'],
  ['failed', 'Failed'],
  ['unread', 'Unread'],
  ['idle', 'Idle'],
] satisfies [keyof typeof sessionRows, string][];

const parityRowNames = agentsList.flatMap((agent) =>
  states.map(
    ([name, label]) => `${agent.label}: ${sessionRows[name].title}, ${label}`,
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
              key={`${agent.agent}:${name}`}
              logo={agent.logo}
              session={{
                ...session,
                title: `${agent.label}: ${session.title}`,
              }}
            />
          );
        }),
      )}
    </>
  ),
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);

      for (const name of parityRowNames) {
        await expect(canvas.getByRole('button', { name })).toBeVisible();
      }
    }
  },
};
