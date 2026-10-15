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

type StoryContext = Parameters<NonNullable<Story['play']>>[0];

const mergeLabel = 'Merge PR';

const optionsLabel = 'Merge options';

const rebaseLabel = 'Rebase and merge';

const checksPassed = {
  view: {
    state: 'open',
    ...withPullRequests(idleSession, [pullRequestMocks.checksPassed]),
  },
} satisfies Story['args'];

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
  args: checksPassed,
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

async function pickMethod(
  { canvas, userEvent }: Pick<StoryContext, 'canvas' | 'userEvent'>,
  name: string,
): Promise<void> {
  await settleViewport(layoutWidths.wide);
  await expect(
    await canvas.findByLabelText('Checks 5/5, passed'),
  ).toBeVisible();
  await userEvent.click(canvas.getByRole('button', { name: optionsLabel }));

  const method = await within(document.body).findByRole('menuitemradio', {
    name,
  });

  // The menu fades in.
  await waitFor(() => expect(method).toBeVisible());
  await userEvent.click(method);
}

// A method picked from the chevron's menu is the one Merge PR runs, and this device keeps it.
export const mergesByThePickedMethod: Story = {
  args: checksPassed,
  play: async (context) => {
    const { header } = openProps(context.args.view);
    await pickMethod(context, rebaseLabel);
    await expect(header.onMergeMethodChange).toHaveBeenCalledWith('rebase');
    await expect(header.onMerge).not.toHaveBeenCalled();
    await context.userEvent.click(
      context.canvas.getByRole('button', { name: mergeLabel }),
    );
    await expect(header.onMerge).toHaveBeenCalledWith(45, 'rebase');
  },
};

// The menu ticks the method picked last.
export const ticksThePickedMethod: Story = {
  args: checksPassed,
  play: async (context) => {
    await pickMethod(context, rebaseLabel);
    await context.userEvent.click(
      context.canvas.getByRole('button', { name: optionsLabel }),
    );
    const menu = within(document.body);

    await expect(
      await menu.findByRole('menuitemradio', { name: rebaseLabel }),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(
      menu.getByRole('menuitemradio', { name: 'Squash and merge' }),
    ).toHaveAttribute('aria-checked', 'false');
  },
};

// The method this device used last is ticked, and Merge PR runs it.
export const mergesByTheLastMethod: Story = {
  args: {
    view: {
      ...checksPassed.view,
      header: { ...checksPassed.view.header, mergeMethod: 'merge' },
    },
  },
  play: async ({ canvas, args, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      await canvas.findByRole('button', { name: mergeLabel }),
    );
    await expect(openProps(args.view).header.onMerge).toHaveBeenCalledWith(
      45,
      'merge',
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
