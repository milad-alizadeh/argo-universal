import { expect, within } from 'storybook/test';
import {
  agentUnavailable,
  configuration,
} from '../../../../../mocks/session-view/session-view-agent.test.mocks';
import {
  failedWithoutReason,
  failedWithReason,
} from '../../../../../mocks/session-view/session-view-failure.test.mocks';
import {
  listsEveryPullRequest,
  mergesByTheLastMethod,
  mergesByThePickedMethod,
  mergesWhenChecksPass,
  mergeWaitsForChecks,
  ticksThePickedMethod,
} from '../../../../../mocks/session-view/session-view-merge.test.mocks';
import { feedReflowsAfterThePaneCollapses } from '../../../../../mocks/session-view/session-view-pane.test.mocks';
import {
  feedScrollTestId,
  meta as sessionViewTestMeta,
  openProps,
  type Story,
} from '../../../../../mocks/session-view/session-view-story.test.mocks';
import { eachLayout, layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { emptySession, idleSession, runningHeader } from './session-view.mocks';

const meta = { ...sessionViewTestMeta, title: 'Tests/SessionView' };

export default meta;

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

export const MergeWaitsForChecks = mergeWaitsForChecks;

export const MergesWhenChecksPass = mergesWhenChecksPass;

export const MergesByThePickedMethod = mergesByThePickedMethod;

export const TicksThePickedMethod = ticksThePickedMethod;

export const MergesByTheLastMethod = mergesByTheLastMethod;

export const ListsEveryPullRequest = listsEveryPullRequest;

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
        draft: { text: 'Keep this while offline', attachments: [] },
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

export const FailedWithReason = failedWithReason;

export const FailedWithoutReason = failedWithoutReason;

export const AgentUnavailableFirstAgent = agentUnavailable(0);

export const AgentUnavailableSecondAgent = agentUnavailable(1);

export const ConfigurationFirstAgent = configuration(0);

export const ConfigurationSecondAgent = configuration(1);

export const FeedReflowsAfterThePaneCollapses =
  feedReflowsAfterThePaneCollapses;
