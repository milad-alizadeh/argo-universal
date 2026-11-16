import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import {
  type MockInstance,
  expect,
  screen,
  spyOn,
  waitFor,
} from 'storybook/test';
import { pullRequestMocks } from '../../../features/sessions/components/session-pull-request.mocks';
import {
  fewChanges,
  findFileHeader,
  largeFile,
  MemoryChangesInspector,
  noChanges,
} from './session-changes.test.mocks';
import { withPullRequests } from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

// A pull request opens in a new window; the story records the address instead of leaving.
let opened: MockInstance<typeof window.open>;

const [first, second] = [
  pullRequestMocks.checksRunning,
  pullRequestMocks.followUp,
];

const session = (
  pullRequests: Parameters<typeof withPullRequests>[1],
): NonNullable<Parameters<typeof MemoryChangesInspector>[0]['header']> =>
  withPullRequests(idleSession, pullRequests).header;

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangesPullRequests',
  globals: { mode: 'light' },
  args: { catalog: fewChanges, header: session([first, second]) },
  render: (args): JSX.Element => <MemoryChangesInspector {...args} />,
  beforeEach: (): (() => void) => {
    opened = spyOn(window, 'open').mockReturnValue(null);

    return (): void => opened.mockRestore();
  },
} satisfies Meta<typeof MemoryChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

interface RowQuery {
  name: string;
}

const rowOf = (number: number): RowQuery => ({
  name: `Open Change #${number} on GitHub`,
});

const above = (upper: HTMLElement, lower: HTMLElement): boolean =>
  upper.getBoundingClientRect().bottom <= lower.getBoundingClientRect().top;

// The sheet lists the Session's PRs in Slot order, above the Checkout's files.
export const ListsPullRequestsAboveFilesOnPhone: Story = {
  play: async () => {
    await settleLayout('phone');
    const one = await screen.findByRole('button', rowOf(first.number));
    const two = screen.getByRole('button', rowOf(second.number));
    const file = await findFileHeader(largeFile);

    await expect(above(one, two)).toBe(true);
    await expect(above(two, file)).toBe(true);
  },
};

// A press on a row opens the PR through the App's external-link opener.
export const OpensAPullRequestOnPhone: Story = {
  play: async ({ userEvent }) => {
    await settleLayout('phone');
    await userEvent.click(
      await screen.findByRole('button', rowOf(second.number)),
    );
    await waitFor(() => expect(opened).toHaveBeenCalledTimes(1));
    await expect(opened.mock.calls[0]?.[0]).toBe(second.url);
  },
};

// With no PRs the sheet holds the files alone.
export const HoldsNoRowsWithoutPullRequests: Story = {
  args: { header: session([]) },
  play: async () => {
    await settleLayout('phone');
    await findFileHeader(largeFile);
    await expect(
      screen.queryByRole('button', { name: /^Open Change #/ }),
    ).toBeNull();
  },
};

// With nothing changed in the Checkout the sheet still shows the PRs, and no Checkout totals.
export const ShowsPullRequestsWithNoCheckoutChanges: Story = {
  args: { catalog: noChanges },
  play: async () => {
    await settleLayout('phone');
    await expect(
      await screen.findByRole('button', rowOf(first.number)),
    ).toBeVisible();
    await expect(
      screen.getByRole('button', rowOf(second.number)),
    ).toBeVisible();
  },
};

// The wide Inspector's Changes tab holds the files and no PRs (ADR-0052).
export const LeavesPullRequestsOutOfTheWideInspector: Story = {
  play: async () => {
    await settleLayout('wide');
    await findFileHeader(largeFile);
    await expect(
      screen.queryByRole('button', { name: /^Open Change #/ }),
    ).toBeNull();
  },
};
