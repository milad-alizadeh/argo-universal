import { expect, waitFor, within } from 'storybook/test';
import {
  pullRequestMocks,
  withPullRequests,
} from '../../src/features/sessions/components/session-view/session-view-pull-request.mocks';
import {
  idleSession,
  runningSession,
} from '../../src/features/sessions/components/session-view/session-view.mocks';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import { openProps, type Story } from './session-view-story.test.mocks';

const mergeLabel = 'Merge PR';

const optionsLabel = 'Merge options';

// Checks still run: the header names the PR and its checks, and Merge PR waits.
export const mergeWaitsForChecks: Story = {
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
    await expect(
      canvas.getByRole('button', { name: optionsLabel }),
    ).toBeDisabled();
  },
};

export const mergesWhenChecksPass: Story = {
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

// The chevron's menu merges by another method.
export const mergesByAnotherMethod: Story = {
  args: mergesWhenChecksPass.args,
  play: async ({ canvas, args, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      await canvas.findByLabelText('Checks 5/5, passed'),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: optionsLabel }));

    const rebase = await within(document.body).findByRole('menuitem', {
      name: 'Rebase and merge',
    });

    // The menu fades in.
    await waitFor(() => expect(rebase).toBeVisible());
    await userEvent.click(rebase);
    await expect(openProps(args.view).header.onMerge).toHaveBeenCalledWith(
      45,
      'rebase',
    );
  },
};

// The header shows one PR; "+1 PR" lists them all and picks the one shown.
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
