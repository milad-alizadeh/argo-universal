import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import {
  pullRequestMocks,
  withPullRequests,
} from '../../src/screens/sessions/$id/session-detail-view-pull-request.mocks';
import {
  idleSession,
  runningSession,
} from '../../src/screens/sessions/$id/session-detail-view.mocks';
import { openProps, type Story } from './session-view-story.test.mocks';

const mergeLabel = 'Merge';

const optionsLabel = 'Merge options';

export const checksPassed = {
  view: {
    state: 'open',
    ...withPullRequests(idleSession, [pullRequestMocks.checksPassed]),
  },
} satisfies Story['args'];

// Checks still run: the header names the PR and its checks, and Merge waits.
export const mergeWaitsForChecks: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(runningSession, [pullRequestMocks.checksRunning]),
    },
  },
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      await canvas.findByLabelText('Change #45, Open'),
    ).toBeVisible();
    await expect(
      canvas.getByLabelText('CI Checks 3/5, 2 running'),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: mergeLabel }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: optionsLabel }),
    ).toBeDisabled();
  },
};

export const mergesWhenChecksPass: Story = {
  args: checksPassed,
  play: async ({ canvas, args, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      await canvas.findByLabelText('CI Checks 5/5, passed'),
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

// The header shows one PR; "+1 Change" lists them all and picks the one shown.
export const listsEveryPullRequest: Story = {
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
      await canvas.findByLabelText('CI Checks 4/5, 1 failing'),
    ).toBeVisible();
    await expect(canvas.queryByLabelText('Change #46, Open, Draft')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: '+1 Change' }));
    const overlay = within(document.body);

    // The shown PR is the checked one of a single choice.
    const listed = await overlay.findByRole('menuitemradio', {
      name: new RegExp(pullRequestMocks.checksFailing.title),
    });

    // The menu fades in.
    await waitFor(() => expect(listed).toBeVisible());
    await userEvent.click(
      overlay.getByRole('menuitemradio', {
        name: new RegExp(pullRequestMocks.followUp.title),
      }),
    );
    await expect(
      await canvas.findByLabelText('Change #46, Open, Draft'),
    ).toBeVisible();
    // The draft has no checks to show.
    await expect(canvas.queryByLabelText(/^CI Checks /)).toBeNull();
  },
};
