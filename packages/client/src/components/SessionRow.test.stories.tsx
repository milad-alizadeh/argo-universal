import { agentsList, sessionRows } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { sessionRowMocks } from '../../mocks/session-row-mock';
import { settleViewport } from '../../mocks/settle-viewport';
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

export const PaperMetadataDimensions: Story = {
  args: {
    session: sessionRowMocks.finishedSubagents,
    issue: { number: 96 },
    pullRequest: { number: 44, status: 'merged' },
  },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const groups = [
        canvas.getByLabelText('Plan: 5 of 5 complete'),
        canvas.getByLabelText('Subagents: 3, 0 running'),
        canvas.getByLabelText('Issue #96'),
        canvas.getByLabelText('merged PR #44'),
      ];
      await expect(canvas.getByText('5/5')).toBeVisible();
      for (const text of ['5/5', '3', '#96', '#44']) {
        const style = getComputedStyle(canvas.getByText(text, { exact: true }));
        await expect(style.fontSize).toBe('12px');
        await expect(style.lineHeight).toBe('16px');
        await expect(style.fontWeight).toBe('400');
      }
      for (const group of groups.slice(1)) {
        const icon = group.querySelector('svg');
        if (!icon) throw new Error('Missing metadata icon');
        await expect(icon.getBoundingClientRect().width).toBe(16);
        await expect(icon.getBoundingClientRect().height).toBe(16);
        await expect(getComputedStyle(group).gap).toBe('4px');
      }
      const bar = groups[0]?.firstElementChild;
      if (!bar) throw new Error('Missing Plan bar');
      await expect(bar.getBoundingClientRect().width).toBe(40);
      await expect(bar.getBoundingClientRect().height).toBe(4);
      await expect(getComputedStyle(bar).gap).toBe('2px');
      await expect(getComputedStyle(bar.parentElement as Element).gap).toBe(
        '6px',
      );
      for (let index = 1; index < groups.length; index++) {
        const previous = groups[index - 1]?.getBoundingClientRect();
        const current = groups[index]?.getBoundingClientRect();
        if (!previous || !current) throw new Error('Missing metadata group');
        await expect(current.left - previous.right).toBe(12);
        await expect(current.top + current.height / 2).toBe(
          previous.top + previous.height / 2,
        );
      }
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
      const title = canvas.getByText(sessionRows.idle.title);
      const pullRequest = canvas.getByLabelText('open PR #45');
      await expect(pullRequest).toBeVisible();
      await expect(pullRequest.getBoundingClientRect().left).toBe(
        title.getBoundingClientRect().left,
      );
    }
  },
};

export const PullRequestWithoutOtherMetadataDark: Story = {
  ...PullRequestWithoutOtherMetadata,
  globals: { mode: 'dark' },
};

export const StableTextWhenPressed: Story = {
  args: {
    session: sessionRowMocks.planAndSubagents,
    issue: { number: 128 },
    pullRequest: { number: 45, status: 'merged' },
  },
  play: async ({ canvas, args }) => {
    const { page, userEvent } = await import('vitest/browser');
    await page.viewport(1440, 844);
    const row = canvas.getByRole('button');
    const texts = [
      args.session.title,
      args.session.activity,
      '2/5',
      '3',
      '#128',
      '#45',
    ].map((text) => canvas.getByText(text, { exact: true }));
    const before = texts.map((text) => getComputedStyle(text).color);
    let during = Promise.resolve<string[]>([]);
    row.addEventListener(
      'mousedown',
      () => {
        during = new Promise((resolve) => {
          setTimeout(
            () => resolve(texts.map((text) => getComputedStyle(text).color)),
            100,
          );
        });
      },
      { once: true },
    );
    await userEvent.click(row, { delay: 200 });
    await expect(await during).toEqual(before);
  },
};

export const StableTextWhenPressedDark: Story = {
  ...StableTextWhenPressed,
  globals: { mode: 'dark' },
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
    const runningDot = running.querySelector('[data-testid="session-status"]');
    const waitingDot = waiting.querySelector('[data-testid="session-status"]');
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
    for (const dot of [runningDot, waitingDot]) {
      await expect(
        Number(getComputedStyle(dot).opacity),
      ).toBeGreaterThanOrEqual(0.45);
      await expect(getComputedStyle(dot).boxShadow).not.toBe('none');
      await expect(getComputedStyle(dot).boxShadow).toContain(
        getComputedStyle(dot).backgroundColor,
      );
      const container = dot.parentElement;
      if (!container) throw new Error('Missing status container');
      await expect(getComputedStyle(container).boxShadow).toBe('none');
      await expect(getComputedStyle(container).opacity).toBe('1');
      await expect(getComputedStyle(container).backgroundColor).toBe(
        getComputedStyle(container).borderTopColor,
      );
      await expect(getComputedStyle(dot).borderWidth).toBe('0px');
      const bounds = container.getBoundingClientRect();
      const logoBounds = container.parentElement?.getBoundingClientRect();
      if (!logoBounds) throw new Error('Missing status container');
      await expect(bounds.top).toBeLessThan(logoBounds.top);
      await expect(bounds.right).toBeGreaterThan(logoBounds.right);
    }
    await expect(getComputedStyle(runningLogo).opacity).toBe('1');
    await expect(getComputedStyle(waitingLogo).transform).toBe(waitingRotation);
    for (const [name, label] of [
      ['Fix the failing build', 'Failed'],
      ['New results to review', 'Unread'],
      ['Finished work', 'Idle'],
    ]) {
      const dot = canvas
        .getByRole('button', { name: `First Agent: ${name}, ${label}` })
        .querySelector('[data-testid="session-status"]');
      if (!dot) throw new Error('Missing Session status');
      await expect(getComputedStyle(dot).opacity).toBe('1');
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
      await expect(canvas.getByTestId('subagents-status')).toBeVisible();
    }
  },
};

export const NoPlanOrSubagents: Story = {
  args: { session: sessionRows.idle },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const [width, height] of [
      [390, 70],
      [1440, 54],
    ] as const) {
      await page.viewport(width, 844);
      await waitFor(() =>
        expect(canvas.getByRole('button').getBoundingClientRect().height).toBe(
          height,
        ),
      );
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
      const container = row.querySelector(
        '[data-testid="session-status-container"]',
      );
      if (!container) throw new Error('Missing status container');
      await expect(getComputedStyle(container).backgroundColor).toBe(
        getComputedStyle(container).borderTopColor,
      );
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

export const PaperMetadataDimensionsDark: Story = {
  ...PaperMetadataDimensions,
  globals: { mode: 'dark' },
};
