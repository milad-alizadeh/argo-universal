import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import { useStackPush, withStack } from '@repo/kit/story-stack';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { View } from 'react-native';
import { expect, screen, waitFor } from 'storybook/test';
import {
  meta as sessionViewMeta,
  type Story,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import { pullRequestMocks } from '../../../features/sessions/components/session-pull-request.mocks';
import { coverageCardSummary } from './sections/plugin-card.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { workbenchSheetSession } from './session-detail-view-panels.test.mocks';
import { idleSession } from './session-detail-view.mocks';
import { openWorkbench } from './session-workbench-sheet.test.mocks';

const meta = {
  ...sessionViewMeta,
  title: 'Tests/Screens/Sessions/Session/HeaderWorkbench',
  decorators: [withStack({ detail: OtherScreen })],
  args: { view: workbenchSheetSession },
  beforeEach: (): Promise<void> => settleLayout('phone'),
};

export default meta;

const task = workbenchSheetSession.shells.shells[0];

if (!task) throw new Error('Recorded catalog needs a background task.');

const firstTask = task.description ?? task.command;

export const ListsAvailableSectionsInOrder: Story = {
  play: async (context) => {
    const sheet = await openWorkbench(context);
    const labels = ['Changes', 'Agents', 'Background Tasks', 'Coverage'];
    const sections = labels.map((label) => sheet.getByText(label));

    for (const [index, section] of sections.entries()) {
      const next = sections[index + 1];

      if (next)
        await expect(section.compareDocumentPosition(next)).toBe(
          Node.DOCUMENT_POSITION_FOLLOWING,
        );
    }
  },
};

export const OmitsSectionsWithoutWork: Story = {
  args: { view: { state: 'open', ...idleSession } },
  play: async (context) => {
    const sheet = await openWorkbench(context);

    await expect(sheet.getAllByRole('link')).toEqual([
      sheet.getByRole('link', { name: /^Changed files/ }),
    ]);
  },
};

function opensDetail(rowName: RegExp, detail: string): Story {
  return {
    play: async (context) => {
      const sheet = await openWorkbench(context);
      const row = sheet.getByRole('link', { name: rowName });
      await settleOverlays(row);
      await context.userEvent.click(row);

      await expect(
        await sheet.findByRole('heading', { name: detail }),
      ).toBeVisible();
    },
  };
}

const pullRequest = pullRequestMocks.checksRunning;

export const OpensPullRequest: Story = {
  ...opensDetail(
    new RegExp(`^#${pullRequest.number} ${pullRequest.title}, Open$`),
    `Change #${pullRequest.number}`,
  ),
  args: {
    view: {
      ...workbenchSheetSession,
      header: { ...workbenchSheetSession.header, pullRequests: [pullRequest] },
    },
  },
};

export const OpensChanges = opensDetail(/^Changed files/, 'Changed files');

export const OpensBackgroundTask = opensDetail(
  new RegExp(`^${firstTask}`),
  firstTask,
);

export const BackFromPluginCardReturnsToWorkbench: Story = {
  play: async (context) => {
    const sheet = await openWorkbench(context);
    const row = sheet.getByRole('link', { name: 'Open Coverage' });
    await settleOverlays(row);
    await context.userEvent.click(row);

    await sheet.findByText(coverageCardSummary);

    const back = await sheet.findByRole('button', {
      name: 'Back to Workbench',
    });

    await settleOverlays(back);
    await context.userEvent.click(back);
    await expect(
      await sheet.findByRole('link', { name: 'Open Coverage' }),
    ).toBeVisible();
  },
};

export const ClosesWorkbenchFromTheHeader: Story = {
  play: async (context) => {
    const sheet = await openWorkbench(context);
    const close = sheet.getByRole('button', { name: 'Close' });
    await settleOverlays(close);
    await context.userEvent.click(close);

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Workbench' })).toBeNull(),
    );
  },
};

export const UsesTheExistingWorkbenchOnWideWindows: Story = {
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Toggle Workbench' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Workbench' }),
    ).toBeNull();
  },
};

function OtherScreen(): JSX.Element {
  const router = useRouter();

  return <Button label="Return to Session" onPress={() => router.back()} />;
}

function NavigableSession(): JSX.Element {
  const push = useStackPush();

  return (
    <View style={{ flex: 1 }}>
      <Button label="Open another screen" onPress={() => push('detail')} />
      <FramedSessionPreview {...workbenchSheetSession} />
    </View>
  );
}

export const OpensAfterReturningToTheSession: Story = {
  render: () => <NavigableSession />,
  play: async (context) => {
    const { canvas, userEvent } = context;

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open another screen' }),
    );
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Return to Session' }),
    );

    const sheet = await openWorkbench(context);

    await expect(
      sheet.getByRole('link', { name: /^Changed files/ }),
    ).toBeVisible();
  },
};

export const ComposerKeepsTheChangesShortcut: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: /^Changes,/ }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /^Agents:/ })).toBeNull();
    await expect(
      canvas.queryByRole('button', { name: /^Background Tasks:/ }),
    ).toBeNull();
  },
};
