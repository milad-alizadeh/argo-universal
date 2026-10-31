import { eachLayout, settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, within } from 'storybook/test';
import { configuration } from '../../../../mocks/session-view/session-view-agent.test.mocks';
import { archivedIsReadOnly } from '../../../../mocks/session-view/session-view-archived.test.mocks';
import { authenticationRequired } from '../../../../mocks/session-view/session-view-callout.test.mocks';
import {
  failedWithoutReason,
  failedWithReason,
  missing,
} from '../../../../mocks/session-view/session-view-failure.test.mocks';
import { lastRowRestsAboveTheComposer } from '../../../../mocks/session-view/session-view-feed-end.test.mocks';
import { feedReflowsAfterThePaneCollapses } from '../../../../mocks/session-view/session-view-pane.test.mocks';
import { previewShowsTheFeedAlone } from '../../../../mocks/session-view/session-view-preview.test.mocks';
import {
  feedScrollTestId,
  meta as sessionDetailViewTestMeta,
  openProps,
  type Story,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import {
  emptySession,
  idleSession,
  runningHeader,
} from './session-detail-view.mocks';

const meta = {
  ...sessionDetailViewTestMeta,
  title: 'Tests/Screens/Sessions/Session',
};

export default meta;

export const RunningTurn: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        await canvas.findByRole('heading', { name: /^Think briefly first/ }),
      ).toBeVisible();

      if (wide) {
        // Spec 0020 deletes the repeated header meta; the Live header still states the Turn.
        await expect(canvas.queryByText('Running')).toBeNull();
        await expect(
          canvas.getByRole('button', { name: 'More' }),
        ).toBeVisible();
      } else {
        // A narrow header holds the plain title and the Session's ⋯: no status, and no Changes.
        await expect(canvas.queryByText('Running')).toBeNull();
        await expect(
          canvas.queryByRole('button', { name: 'Changes' }),
        ).toBeNull();
        await expect(
          canvas.getByRole('button', { name: 'More' }),
        ).toBeVisible();
      }

      await expect(canvas.getByRole('status')).toHaveTextContent(
        runningHeader.text,
      );
    }),
};

export const StopsTheTurn: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await settleLayout('phone');
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
        await expect(canvas.queryByText('Idle')).toBeNull();
        await expect(canvas.queryByText(/^for /)).toBeNull();
      }

      await expect(canvas.queryByRole('status')).toBeNull();
      await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeVisible();
    }),
};

// The band owns identity; the Feed and Composer keep the Session layout surface.
export const BandOwnsIdentityWhileFeedAndComposerShareOneLayout: Story = {
  play: async ({ canvas }) => {
    await settleLayout('wide');
    const layout = within(await canvas.findByTestId('session-layout'));

    const title = await canvas.findByRole('heading', {
      name: /^Think briefly first/,
    });

    await expect(canvas.getByTestId('window-band')).toContainElement(title);
    await expect(layout.getByTestId(feedScrollTestId)).toBeVisible();
    await expect(
      layout.getByRole('textbox', { name: 'Message' }),
    ).toBeVisible();
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

export const MissingSession = missing;

export const ConfigurationFirstAgent = configuration(0);

export const ConfigurationSecondAgent = configuration(1);

export const FeedReflowsAfterThePaneCollapses =
  feedReflowsAfterThePaneCollapses;

export const LastRowRestsAboveTheComposer = lastRowRestsAboveTheComposer;

export const AuthenticationRequired = authenticationRequired;

export const PreviewShowsTheFeedAlone = previewShowsTheFeedAlone;

export const ArchivedIsReadOnly = archivedIsReadOnly;
