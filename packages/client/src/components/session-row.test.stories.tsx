import { agentsList, sessionRows } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { sessionRowMocks } from '../../mocks/session-row-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { SessionRow } from './session-row';

const statusSelector = '[data-testid="session-status"]';

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

function running(width: number): Story {
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
export const RunningPhone = running(layoutWidths.phone);
export const RunningWide = running(layoutWidths.wide);

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
      canvasElement.querySelectorAll('[data-testid="session-logo"] path'),
    ).toHaveLength(2);
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

function metadata(width: number): Story {
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
export const MetadataPhone = metadata(layoutWidths.phone);
export const MetadataWide = metadata(layoutWidths.wide);

export const PullRequestWithoutOtherMetadata: Story = {
  args: {
    session: sessionRows.idle,
    pullRequest: { number: 45, status: 'open' },
  },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(canvas.getByLabelText('open PR #45')).toBeVisible();
    }
  },
};

export const PullRequestWithoutOtherMetadataDark: Story = {
  ...PullRequestWithoutOtherMetadata,
  globals: { mode: 'dark' },
};

const states = [
  ['needsInput', 'Needs input'],
  ['running', 'Running'],
  ['failed', 'Failed'],
  ['unread', 'Unread'],
  ['idle', 'Idle'],
] satisfies [keyof typeof sessionRows, string][];

export const StatusParity: Story = {
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
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      for (const agent of agentsList) {
        for (const [name, label] of states) {
          const session = sessionRows[name];
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

export const StatusMotion: Story = {
  ...StatusParity,
  play: async ({ canvas }) => {
    const running = canvas.getByRole('button', {
      name: 'First Agent: Build the settings screen, Running',
    });
    const waiting = canvas.getByRole('button', {
      name: 'First Agent: Review the proposed change, Needs input',
    });
    const runningLogo = running.querySelector(
      '[data-testid="session-logo"]',
    )?.parentElement;
    const waitingLogo = waiting.querySelector(
      '[data-testid="session-logo"]',
    )?.parentElement;
    if (!runningLogo || !waitingLogo) throw new Error('Missing Agent logo');
    const rotation = getComputedStyle(runningLogo).transform;
    const waitingRotation = getComputedStyle(waitingLogo).transform;
    const runningDot = running.querySelector(statusSelector);
    const waitingDot = waiting.querySelector(statusSelector);
    if (!runningDot || !waitingDot) throw new Error('Missing Session status');
    const runningOpacity = getComputedStyle(runningDot).opacity;
    const waitingOpacity = getComputedStyle(waitingDot).opacity;
    await waitFor(() =>
      expect(getComputedStyle(runningLogo).transform).not.toBe(rotation),
    );
    await waitFor(() =>
      expect(getComputedStyle(runningDot).opacity).not.toBe(runningOpacity),
    );
    await waitFor(() =>
      expect(getComputedStyle(waitingDot).opacity).not.toBe(waitingOpacity),
    );
    await expect(getComputedStyle(waitingLogo).transform).toBe(waitingRotation);
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
      await expect(canvas.getByTestId('subagents-status')).toBeVisible();
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
      await expect(
        canvas.queryByTestId('session-issue-slot'),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByTestId('session-pull-request-slot'),
      ).not.toBeInTheDocument();
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
        canvas.queryByTestId('subagents-status'),
      ).not.toBeInTheDocument();
    }
  },
};

function longTitleSelected(width: number): Story {
  return {
    args: { session: sessionRows.longTitle, selected: true },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      const row = canvas.getByRole('button', {
        name: `${sessionRows.longTitle.title}, Idle`,
      });
      await expect(row).toHaveAttribute('aria-selected', 'true');
      const title = canvas.getByText(sessionRows.longTitle.title);
      await expect(title).toBeVisible();
      await expect(title).toHaveStyle({ overflow: 'hidden' });
      await expect(args.onSelect).not.toHaveBeenCalled();
      await userEvent.click(row);
      await expect(args.onSelect).toHaveBeenCalledWith('session-long-title');
    },
  };
}
export const LongTitleSelectedPhone = longTitleSelected(layoutWidths.phone);
export const LongTitleSelectedWide = longTitleSelected(layoutWidths.wide);

export const StatusParityDark: Story = {
  ...StatusParity,
  globals: { mode: 'dark' },
};
export const RunningPhoneDark: Story = {
  ...RunningPhone,
  globals: { mode: 'dark' },
};
export const RunningWideDark: Story = {
  ...RunningWide,
  globals: { mode: 'dark' },
};
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
export const LongTitleSelectedPhoneDark: Story = {
  ...LongTitleSelectedPhone,
  globals: { mode: 'dark' },
};
export const LongTitleSelectedWideDark: Story = {
  ...LongTitleSelectedWide,
  globals: { mode: 'dark' },
};
export const ArchivedDark: Story = { ...Archived, globals: { mode: 'dark' } };
export const MetadataPhoneDark: Story = {
  ...MetadataPhone,
  globals: { mode: 'dark' },
};
export const MetadataWideDark: Story = {
  ...MetadataWide,
  globals: { mode: 'dark' },
};
