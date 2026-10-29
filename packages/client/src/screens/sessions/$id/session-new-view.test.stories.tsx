import { findToast } from '@repo/kit/mocks/find-toast';
import { shownText } from '@repo/kit/mocks/shown-text';
import { eachLayout } from '@repo/kit/mocks/story-layout';
import { expect, fn, screen } from 'storybook/test';
import {
  checkoutChoice,
  narrowMainColumn,
} from '../../../../mocks/new-session-view/new-session-checkout.test.mocks';
import {
  readyArgs,
  sendsTheFirstPrompt,
  sendsWhileTheSessionOpens,
} from '../../../../mocks/new-session-view/new-session-send.test.mocks';
import {
  meta as sessionNewViewTestMeta,
  type Story,
} from '../../../../mocks/new-session-view/new-session-story.test.mocks';
import {
  exampleProject,
  readyNewSession,
  startingNewSession,
  typedDraft,
} from './session-new-view.mocks';

const sendLabel = 'Send';

const messageLabel = 'Message';

const failedStartMessage = 'Agent exited with status 1';

const projectLabel = `Project: ${exampleProject.name}`;

const meta = {
  ...sessionNewViewTestMeta,
  title: 'Tests/Screens/Sessions/New Session',
};

export default meta;

export const NarrowMainColumn = narrowMainColumn;

export const CheckoutChoice = checkoutChoice;

export const Ready: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        await canvas.findByRole('button', { name: projectLabel }),
      ).toBeVisible();
      // The Server runs on this computer, so the host is not named.
      await expect(
        canvas.queryByText(readyNewSession.serverName),
      ).not.toBeInTheDocument();

      const heading = canvas.queryByRole('heading', {
        name: 'What should we work on?',
      });

      await (wide ? expect(heading).toBeVisible() : expect(heading).toBeNull());
      // A phone shows the checkout among the rows; a wide window keeps it in the envelope.
      await expect(
        canvas.getAllByRole('button', { name: 'Checkout' }),
      ).toHaveLength(1);
      await expect(
        canvas.getByRole('textbox', { name: messageLabel }),
      ).toBeVisible();
      // An empty prompt has nothing to send.
      await expect(
        canvas.getByRole('button', { name: sendLabel }),
      ).toBeDisabled();
      await expect(
        canvas.queryByRole('button', { name: 'Open Session' }),
      ).toBeNull();
      await expect(canvas.queryByText('Reconnecting…')).toBeNull();
    }),
};

// The Server keeps the chosen Agent's list, so the menu works before the first Send.
export const OffersTheChosenAgentsSlashCommands: Story = {
  args: readyArgs({
    slashCommands: [{ name: 'review', description: 'Review changes' }],
  }),
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole('textbox', { name: messageLabel }),
      '/re',
    );
    await expect(
      await screen.findByRole('option', { name: '/review Review changes' }),
    ).toBeVisible();
  },
};

export const SendsTheFirstPrompt = sendsTheFirstPrompt;

export const SendsWhileTheSessionOpens = sendsWhileTheSessionOpens;

export const Reconnecting: Story = {
  args: readyArgs({ connected: false, canOpen: false, draft: typedDraft }),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('img', { name: 'Reconnecting' }),
      ).toBeVisible();
      await expect(canvas.getByText('Reconnecting…')).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: sendLabel }),
      ).toBeDisabled();
    }),
};

export const Starting: Story = {
  args: readyArgs(startingNewSession),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const [prompt] = await canvas.findAllByText(typedDraft.text);
      await expect(prompt).toBeVisible();
      await expect(canvas.getByRole('status')).toHaveAccessibleName(/^Working/);
      await expect(
        canvas.queryByRole('progressbar', { name: 'Sending' }),
      ).toBeNull();
      await expect(
        shownText(canvas.getByRole('textbox', { name: messageLabel })),
      ).toBe('');
      await expect(
        canvas.getByRole('button', { name: sendLabel }),
      ).toBeDisabled();
      // A Session has no Project row, so it goes before the hand-off.
      await expect(
        canvas.queryByRole('button', { name: projectLabel }),
      ).toBeNull();
    }),
};

const onRetry = fn();

// The callout sits above the Composer, which keeps the prompt; on a phone it is a sheet.
export const FailedStart: Story = {
  args: readyArgs({
    callout: {
      kind: 'launch',
      message: failedStartMessage,
      onRetry,
    },
    draft: typedDraft,
  }),
  play: async ({ canvas, userEvent }) => {
    const retry = await canvas.findByRole('button', { name: 'Retry' });

    await expect(canvas.getByText(/Launch/)).toBeVisible();
    await expect(canvas.getByText(failedStartMessage)).toBeVisible();
    await expect(
      shownText(canvas.getByRole('textbox', { name: messageLabel })),
    ).toBe(typedDraft.text);
    await expect(canvas.getByRole('button', { name: sendLabel })).toBeEnabled();
    await userEvent.click(retry);
    await expect(onRetry).toHaveBeenCalledOnce();
  },
};

export const LoadFailure: Story = {
  args: { view: { state: 'load-failed' } },
  play: async ({ canvas }) => {
    await expect(await findToast("Couldn't load New Session")).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Retry' })).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};
