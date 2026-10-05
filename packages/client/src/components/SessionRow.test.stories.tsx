import { agentsList, sessionRows } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { sessionRowMocks } from '../../mocks/session-row-mock';
import { SessionRow } from './SessionRow';

const meta = {
  title: 'Tests/SessionRow',
  component: SessionRow,
  args: {
    session: sessionRows.running,
    logo: agentsList[0]?.logo ?? '',
    onSelect: fn(),
  },
} satisfies Meta<typeof SessionRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(canvas.getByText('Running the tests')).toBeVisible();
      const row = canvas.getByRole('button', {
        name: 'Build the settings screen, Running',
      });
      await userEvent.click(row);
      await expect(args.onSelect).toHaveBeenCalledWith('session-running');
    }
  },
};

export const PaperRowDimensions: Story = {
  args: { session: sessionRowMocks.planAndSubagents },
  play: async ({ canvas, canvasElement }) => {
    const { page } = await import('vitest/browser');
    for (const [width, height] of [
      [390, 92],
      [1440, 76],
    ] as const) {
      await page.viewport(width, 844);
      const row = canvas.getByRole('button');
      await expect(row).toBeVisible();
      await waitFor(() =>
        expect(
          canvasElement
            .querySelector('[role="button"]')
            ?.getBoundingClientRect().height,
        ).toBe(height),
      );
    }
  },
};

export const PaperAgentSymbols: Story = {
  render: (args) => (
    <>
      {agentsList.map((agent) => (
        <SessionRow {...args} key={agent.agent} logo={agent.logo} />
      ))}
    </>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelectorAll('[data-testid="session-logo"] path')
        .length,
    ).toBe(2);
  },
};

export const Archived: Story = {
  args: { session: sessionRows.archived },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(canvas.getByText('Archived', { exact: true })).toBeVisible();
    }
  },
};

export const Metadata: Story = {
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
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      for (const status of ['open', 'draft', 'merged', 'conflict', 'closed']) {
        await expect(canvas.getByLabelText(`${status} PR #45`)).toBeVisible();
      }
      await expect(canvas.getAllByLabelText('Issue #128')).toHaveLength(5);
      await userEvent.click(
        canvas.getByRole('button', { name: 'open metadata, Running' }),
      );
      await expect(args.onSelect).toHaveBeenCalledWith(args.session.sessionId);
      await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    }
  },
};

const states = {
  needsInput: 'Needs input',
  running: 'Running',
  failed: 'Failed',
  unread: 'Unread',
  idle: 'Idle',
} as const;

export const StatusParity: Story = {
  render: (args) => (
    <>
      {agentsList.flatMap((agent) =>
        Object.keys(states).map((name) => {
          const session = sessionRows[name as keyof typeof states];
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
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      for (const agent of agentsList) {
        for (const [name, label] of Object.entries(states)) {
          const session = sessionRows[name as keyof typeof states];
          await expect(
            canvas.getByRole('button', {
              name: `${agent.label}: ${session.title}, ${label}`,
            }),
          ).toBeVisible();
        }
      }
    }
  },
};

export const PlanAndSubagents: Story = {
  args: {
    session: sessionRowMocks.planAndSubagents,
  },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByLabelText('Plan: 2 of 5 complete'),
      ).toBeVisible();
      await expect(canvas.getByText('2/5')).toBeVisible();
      await expect(
        canvas.getByLabelText('Subagents: 3, 2 running'),
      ).toBeVisible();
      await expect(canvas.getByTestId('subagents-running')).toBeVisible();
    }
  },
};

export const NoPlanOrSubagents: Story = {
  args: { session: sessionRows.idle },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(canvas.queryByLabelText(/^Plan:/)).not.toBeInTheDocument();
      await expect(
        canvas.queryByLabelText(/^Subagents:/),
      ).not.toBeInTheDocument();
      await expect(canvas.getByTestId('session-issue-slot')).toBeVisible();
      await expect(
        canvas.getByTestId('session-pull-request-slot'),
      ).toBeVisible();
    }
  },
};

export const FinishedSubagents: Story = {
  args: {
    session: sessionRowMocks.finishedSubagents,
  },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(canvas.getByText('5/5')).toBeVisible();
      await expect(
        canvas.getByLabelText('Subagents: 3, 0 running'),
      ).toBeVisible();
      await expect(
        canvas.queryByTestId('subagents-running'),
      ).not.toBeInTheDocument();
    }
  },
};

export const LongTitleSelected: Story = {
  args: { session: sessionRows.longTitle, selected: true },
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const row = canvas.getByRole('button', {
        name: `${sessionRows.longTitle.title}, Idle`,
      });
      await expect(row).toHaveAttribute('aria-selected', 'true');
      const title = canvas.getByText(sessionRows.longTitle.title);
      await expect(title).toBeVisible();
      await expect(title).toHaveStyle({ overflow: 'hidden' });
      await userEvent.click(row);
      await expect(args.onSelect).toHaveBeenCalledWith('session-long-title');
    }
  },
};

export const StatusParityDark: Story = {
  ...StatusParity,
  globals: { mode: 'dark' },
};
export const RunningDark: Story = { ...Running, globals: { mode: 'dark' } };
export const PlanAndSubagentsDark: Story = {
  ...PlanAndSubagents,
  globals: { mode: 'dark' },
};
export const NoPlanOrSubagentsDark: Story = {
  ...NoPlanOrSubagents,
  globals: { mode: 'dark' },
};
export const FinishedSubagentsDark: Story = {
  ...FinishedSubagents,
  globals: { mode: 'dark' },
};
export const LongTitleSelectedDark: Story = {
  ...LongTitleSelected,
  globals: { mode: 'dark' },
};
export const ArchivedDark: Story = { ...Archived, globals: { mode: 'dark' } };
export const MetadataDark: Story = { ...Metadata, globals: { mode: 'dark' } };
