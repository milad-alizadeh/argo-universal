import { newSessionCatalogs } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { findToast } from '../../../../../mocks/find-toast';
import { eachLayout, layoutWidths } from '../../../../lib/generic/each-layout';
import { Button } from '../../../../lib/generic/primitives/buttons/button/button';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  type OpenSessionViewProps,
  SessionView,
  type SessionViewProps,
} from './session-view';
import {
  emptySession,
  idleSession,
  pullRequestMocks,
  runningHeader,
  runningSession,
  withPullRequests,
} from './session-view.mocks';

const feedScrollTestId = 'feed-scroll';
const agentFailure = 'The Agent stopped three times in ten minutes';

const meta = {
  title: 'Tests/SessionView',
  parameters: { screenPreview: true },
  args: { view: { state: 'open', ...runningSession } },
  render: ({ view }): React.JSX.Element => <SessionView {...view} />,
} satisfies Meta<{ view: SessionViewProps }>;
export default meta;
type Story = StoryObj<typeof meta>;

function openProps(view: SessionViewProps): OpenSessionViewProps {
  if (view.state !== 'open')
    throw new Error('The story needs an open Session.');
  return view;
}

export const RunningTurn: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        await canvas.findByRole('heading', { name: /^Think briefly first/ }),
      ).toBeVisible();
      if (wide) {
        await expect(canvas.getByText('Running')).toBeVisible();
        await expect(canvas.getByText('4m 12s')).toBeVisible();
      } else {
        // The native header holds the plain title and two items, no status.
        await expect(
          canvas.getByRole('button', { name: 'Changes' }),
        ).toBeVisible();
        await expect(canvas.queryByText('Running')).toBeNull();
      }
      await expect(canvas.getByRole('button', { name: 'More' })).toBeVisible();
      await expect(canvas.getByRole('status')).toHaveTextContent(
        runningHeader.text,
      );
    }),
};

export const StopsTheTurn: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(await canvas.findByRole('button', { name: 'Stop' }));
    await expect(openProps(args.view).composer.onStop).toHaveBeenCalledOnce();
  },
};

export const Idle: Story = {
  args: { view: { state: 'open', ...idleSession } },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        await canvas.findByRole('heading', {
          name: /^Without using any tools/,
        }),
      ).toBeVisible();
      if (wide) {
        await expect(canvas.getByText('Idle')).toBeVisible();
        await expect(canvas.queryByText(/^for /)).toBeNull();
      }
      await expect(canvas.queryByRole('status')).toBeNull();
      await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeVisible();
    }),
};

// The header, the Feed and the Composer sit in one SessionLayout container, so they share its one surface.
export const HeaderFeedAndComposerShareOneLayout: Story = {
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    const layout = within(await canvas.findByTestId('session-layout'));
    await expect(
      await layout.findByRole('heading', { name: /^Think briefly first/ }),
    ).toBeVisible();
    await expect(layout.getByRole('button', { name: 'Changes' })).toBeVisible();
    await expect(layout.getByTestId(feedScrollTestId)).toBeVisible();
    await expect(
      layout.getByRole('textbox', { name: 'Message' }),
    ).toBeVisible();
  },
};

const mergeLabel = 'Merge PR';

// Checks still run: the header names the PR and its checks, and Merge PR waits.
export const MergeWaitsForChecks: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(runningSession, [pullRequestMocks.checksRunning]),
    },
  },
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expect(await canvas.findByLabelText('PR #45, Open')).toBeVisible();
    await expect(canvas.getByLabelText('Checks 3/5, 2 running')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: mergeLabel }),
    ).toBeDisabled();
  },
};

export const MergesWhenChecksPass: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, [pullRequestMocks.checksPassed]),
    },
  },
  play: async ({ canvas, args, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      await canvas.findByLabelText('Checks 5/5, passed'),
    ).toBeVisible();
    const merge = canvas.getByRole('button', { name: mergeLabel });
    await expect(merge).toBeEnabled();
    await userEvent.click(merge);
    await expect(openProps(args.view).header.onMerge).toHaveBeenCalledWith(
      45,
      'squash',
    );
  },
};

// The header shows one PR; "+1 PR" lists them all and picks the one shown.
export const ListsEveryPullRequest: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(runningSession, [
        pullRequestMocks.checksFailing,
        pullRequestMocks.followUp,
      ]),
    },
  },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      await canvas.findByLabelText('Checks 4/5, 1 failing'),
    ).toBeVisible();
    await expect(canvas.queryByLabelText('PR #46, Draft')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: '+1 PR' }));
    const overlay = within(document.body);
    const listed = await overlay.findByRole('menuitem', {
      name: new RegExp(pullRequestMocks.checksFailing.title),
    });
    // The menu fades in.
    await waitFor(() => expect(listed).toBeVisible());
    await userEvent.click(
      overlay.getByRole('menuitem', {
        name: new RegExp(pullRequestMocks.followUp.title),
      }),
    );
    await expect(await canvas.findByLabelText('PR #46, Draft')).toBeVisible();
    // The draft has no checks to show.
    await expect(canvas.queryByLabelText(/^Checks /)).toBeNull();
  },
};

export const EmptyFeed: Story = {
  args: { view: { state: 'open', ...emptySession } },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('heading', { name: 'What should we build?' }),
      ).toBeVisible();
      await expect(canvas.queryByTestId(feedScrollTestId)).toBeNull();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
    }),
};

export const Disconnected: Story = {
  args: {
    view: {
      state: 'open',
      ...idleSession,
      composer: {
        ...idleSession.composer,
        draft: { text: 'Keep this while offline', images: [] },
        sendable: false,
      },
    },
  },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('textbox', { name: 'Message' }),
      ).toBeEnabled();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    }),
};

export const Opening: Story = {
  args: { view: { state: 'opening' } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.queryByRole('textbox', { name: 'Message' })).toBeNull();
  },
};

// A Session that failed gives no prompt and toasts the Server's reason.
export const FailedWithReason: Story = {
  args: { view: { state: 'failed', reason: agentFailure } },
  play: async ({ canvas }) => {
    await expect(await findToast("Couldn't open the Session")).toBeVisible();
    await expect(await findToast(agentFailure)).toBeVisible();
    await expect(canvas.queryByRole('textbox', { name: 'Message' })).toBeNull();
  },
};

// Without a reason from the Server, the toast says the Server didn't respond.
export const FailedWithoutReason: Story = {
  args: { view: { state: 'failed' } },
  play: async () => {
    await expect(await findToast("Couldn't open the Session")).toBeVisible();
    await expect(
      await findToast("The Server didn't respond. Check that it's running."),
    ).toBeVisible();
  },
};

// A started Session's Agent became unavailable: its row says why and Retry asks again.
function agentUnavailable(agentIndex: 0 | 1): Story {
  const agent = newSessionCatalogs.bothUnavailable[agentIndex];
  if (!agent?.installStep)
    throw new Error('Recorded catalog needs two unavailable Agents.');
  const { installStep } = agent;
  const configuration = idleSession.composer.configuration;
  if (!configuration) throw new Error('Idle Session has no configuration.');
  return {
    args: {
      view: {
        state: 'open',
        ...idleSession,
        composer: {
          ...idleSession.composer,
          configuration: {
            ...configuration,
            agents: newSessionCatalogs.bothUnavailable,
            agent: agent.agent,
            configOptions: agent.configOptions,
            onAgentRetry: fn(),
          },
        },
      },
    },
    play: async ({ canvas, args, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Agent and model' }),
      );
      const overlay = within(document.body);
      await userEvent.click(
        await overlay.findByRole('button', { name: /^Agent,/ }),
      );
      const row = await overlay.findByRole('button', {
        name: `Select ${agent.label}`,
      });
      await waitFor(() => expect(row).toBeVisible());
      await expect(row).toBeDisabled();
      await expect(row).toHaveTextContent(installStep);
      await userEvent.click(
        overlay.getByRole('button', { name: `Retry ${agent.label}` }),
      );
      await expect(
        openProps(args.view).composer.configuration?.onAgentRetry,
      ).toHaveBeenCalledOnce();
    },
  };
}

export const AgentUnavailableFirstAgent = agentUnavailable(0);
export const AgentUnavailableSecondAgent = agentUnavailable(1);

// The Session's own Agent shows in the Composer's picker, and a started Session keeps it.
function configuration(agentIndex: 0 | 1): Story {
  const agent = newSessionCatalogs.bothAvailable[agentIndex];
  const base = idleSession.composer.configuration;
  if (!agent || !base) throw new Error('Recorded catalog needs two Agents.');
  return {
    args: {
      view: {
        state: 'open',
        ...idleSession,
        composer: {
          ...idleSession.composer,
          configuration: {
            ...base,
            agent: agent.agent,
            configOptions: agent.configOptions,
          },
        },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      const trigger = await canvas.findByRole('button', {
        name: 'Agent and model',
      });
      await userEvent.click(trigger);
      const overlay = within(document.body);
      await userEvent.click(
        await overlay.findByRole('button', { name: /^Agent,/ }),
      );
      const current = await overlay.findByRole('button', {
        name: `Select ${agent.label}`,
      });
      await waitFor(() => expect(current).toBeVisible());
      // A started Session keeps its Agent.
      await expect(current).toBeDisabled();
    },
  };
}

export const ConfigurationFirstAgent = configuration(0);
export const ConfigurationSecondAgent = configuration(1);

// Collapsed, the pane is a few pixels wide, as while an expanded Inspector takes it over.
const paneWidths = { wide: 1000, collapsed: 5 } as const;

// The Session in a pane whose width the reader changes, as the sidebar and an expanded Inspector change it.
function SessionInPane({
  view,
}: {
  view: SessionViewProps;
}): React.JSX.Element {
  const [width, setWidth] = useState<number>(paneWidths.wide);
  return (
    <View className="h-screen w-full">
      <View className="flex-row">
        <Button
          label="Collapse pane"
          onPress={() => setWidth(paneWidths.collapsed)}
        />
        <Button
          label="Restore pane"
          onPress={() => setWidth(paneWidths.wide)}
        />
      </View>
      <View testID="session-pane" className="flex-1" style={{ width }}>
        <SessionView {...view} />
      </View>
    </View>
  );
}

const rowWidths = (canvas: {
  getAllByTestId: (testId: string) => HTMLElement[];
}): number[] =>
  canvas
    .getAllByTestId('feed-column')
    .map((row) => Math.round(row.getBoundingClientRect().width));

// The Feed's rows reflow to the pane after it collapses and comes back: none stays pinned narrow or spills past the pane.
export const FeedReflowsAfterThePaneCollapses: Story = {
  args: { view: { state: 'open', ...idleSession } },
  render: ({ view }): React.JSX.Element => <SessionInPane view={view} />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await canvas.findByRole('heading', { name: /^Without using any tools/ });
    const before = rowWidths(canvas);
    await expect(Math.min(...before)).toBeGreaterThan(0);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Collapse pane' }),
    );
    await waitFor(() =>
      expect(
        canvas.getByTestId(feedScrollTestId).getBoundingClientRect().width,
      ).toBe(paneWidths.collapsed),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Restore pane' }));
    await waitFor(() => expect(rowWidths(canvas)).toEqual(before));
    const scroll = canvas.getByTestId(feedScrollTestId);
    await expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);
  },
};
