import { eachLayout } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import { agentsList, sessionRows } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Platform } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { SessionRow } from '../../src/features/sessions/components/session-row/session-row';
import type { SessionsLayout } from '../../src/features/sessions/stores/sessions-view';

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
      await settleViewport(width);

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

const states = [
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
      await page.viewport(width, 844);

      for (const name of parityRowNames) {
        await expect(canvas.getByRole('button', { name })).toBeVisible();
      }
    }
  },
};

const dotted = (
  layout: SessionsLayout,
): Record<(typeof states)[number][0], boolean> => ({
  needsInput: true,
  running: true,
  failed: true,
  unread: true,
  idle: layout === 'compact' && Platform.OS === 'web',
});

type Canvas = ReturnType<typeof within>;

async function expectRowEnd(
  canvas: Canvas,
  [name, label]: (typeof states)[number],
  layout: SessionsLayout,
): Promise<void> {
  const row = within(
    canvas.getByRole('button', {
      name: `${sessionRows[name].title}, ${label}`,
    }),
  );

  const dot = row.queryByTestId('session-status');

  await expect(row.getByText('12m')).toBeVisible();
  await (dotted(layout)[name]
    ? expect(dot).toBeVisible()
    : expect(dot).not.toBeInTheDocument());
}

export function statusDots(layout: SessionsLayout): Story {
  return {
    args: { layout, age: '12m' },
    render: (args) => (
      <>
        {states.map(([name]) => (
          <SessionRow {...args} key={name} session={sessionRows[name]} />
        ))}
      </>
    ),
    play: async ({ canvas }) =>
      eachLayout(async () => {
        for (const state of states) await expectRowEnd(canvas, state, layout);
      }),
  };
}
