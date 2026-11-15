import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen } from 'storybook/test';
import { severalPullRequests } from '../../../features/sessions/components/session-pull-request.mocks';
import { ChangesSheet, changedFiles } from './session-changes-sheet.mocks';
import { withPullRequests } from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

const menuRows = severalPullRequests.map((change) => ({
  ...change,
  onCopyLink: fn(),
  onDetach: fn(),
}));

// The sheet lists pull requests on a phone alone; a wide Inspector's Changes tab holds none.
const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangesSheet',
  component: ChangesSheet,
  parameters: { screenPreview: true },
  args: {
    catalog: changedFiles,
    header: withPullRequests(idleSession, menuRows).header,
  },
  beforeEach: async (): Promise<void> => {
    await settleLayout('phone');
  },
} satisfies Meta<typeof ChangesSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// The Session's pull requests lead the sheet, above the Checkout's files.
export const ListsPullRequests: Story = {
  play: async () => {
    const rows = await screen.findAllByRole('button', {
      name: /^Open Change #\d+ on GitHub$/,
    });

    await expect(rows).toHaveLength(severalPullRequests.length);
  },
};

// A row's … on a phone opens the same menu as the wide card's, over the sheet.
export const PullRequestMenuOpens: Story = {
  play: async ({ userEvent }) => {
    const [first] = await screen.findAllByRole('button', {
      name: /^Actions for Change #/,
    });

    if (!first) throw new Error('The sheet drew no pull request row');

    await userEvent.click(first);
    await expect(await screen.findByRole('menu')).toBeVisible();
    await expect(
      (await screen.findAllByRole('menuitem')).length,
    ).toBeGreaterThan(0);
  },
};
