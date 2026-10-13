import { expect } from 'storybook/test';
import { findToast } from '../../../../../mocks/find-toast';
import {
  checkoutChoice,
  narrowMainColumn,
} from '../../../../../mocks/new-session-view/new-session-checkout.test.mocks';
import {
  readyArgs,
  sendsTheFirstPrompt,
  sendsWhileTheSessionOpens,
} from '../../../../../mocks/new-session-view/new-session-send.test.mocks';
import {
  meta as newSessionViewTestMeta,
  type Story,
} from '../../../../../mocks/new-session-view/new-session-story.test.mocks';
import { shownText } from '../../../../../mocks/rich-textarea-example';
import { eachLayout } from '../../../../lib/generic/each-layout';
import {
  exampleProject,
  readyNewSession,
  startingNewSession,
  typedDraft,
} from './new-session-view.mocks';

const sendLabel = 'Send';

const messageLabel = 'Message';

const failedStartMessage = 'The Agent exited before it was ready.';

const setupStepText = 'Run `claude login` on the Server, then check again.';

const projectLabel = `Project: ${exampleProject.name}`;

const meta = { ...newSessionViewTestMeta, title: 'Tests/NewSessionView' };

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

export const NeedsSetup: Story = {
  args: readyArgs({
    canOpen: false,
    draft: typedDraft,
    setupStep: setupStepText,
  }),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByRole('alert')).toHaveTextContent(
        setupStepText,
      );
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

export const FailedStart: Story = {
  args: readyArgs({ openError: failedStartMessage, draft: typedDraft }),
  play: async ({ canvas }) => {
    await expect(await findToast("Couldn't open the Session")).toBeVisible();
    await expect(await findToast(failedStartMessage)).toBeVisible();
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.getByRole('button', { name: sendLabel })).toBeEnabled();
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
