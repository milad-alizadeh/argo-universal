import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import {
  type MockInstance,
  expect,
  screen,
  spyOn,
  within,
  waitFor,
} from 'storybook/test';
import { pullRequestMocks } from '../../../features/sessions/components/session-pull-request.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  severalPullRequests,
  withPullRequests,
} from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

// The page opens a pull request in a new window; the story records the address instead of leaving.
let opened: MockInstance<typeof window.open>;

const meta = {
  title: 'Tests/Screens/Sessions/Session/WorkbenchChanges',
  parameters: { screenPreview: true },
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, severalPullRequests),
    },
  },
  render: ({ view }): ReactElement => <FramedSessionPreview {...view} />,
  beforeEach: async (): Promise<() => void> => {
    await settleLayout(1920);
    opened = spyOn(window, 'open').mockReturnValue(null);

    return (): void => opened.mockRestore();
  },
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

interface RowQuery {
  name: string;
}

const rowOf = (number: number): RowQuery => ({
  name: `Open Change #${number} on GitHub`,
});

const firstChange = rowOf(45);

const showMore = { name: 'Show more' };

const showLess = { name: 'Show less' };

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

// The Feed has its own "Show more" for a long message; the card's is the one in the Workbench.
const workbench = (canvas: Canvas): ReturnType<typeof within> =>
  within(canvas.getByTestId('session-workbench'));

const { title: firstTitle, checks: firstPullRequestChecks } =
  pullRequestMocks.checksRunning;

const firstChecks = firstPullRequestChecks.details;

const hiddenRows = [46, 42, 41];

let consoleErrors: MockInstance<typeof console.error>;

export const BoundedPreview: Story = {
  beforeEach: () => {
    consoleErrors = spyOn(console, 'error');

    return (): void => consoleErrors.mockRestore();
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', firstChange)).toBeVisible();
    await expect(canvas.getByRole('button', rowOf(44))).toBeVisible();
    await expect(canvas.getByRole('button', rowOf(43))).toBeVisible();

    for (const number of hiddenRows) {
      await expect(canvas.queryByRole('button', rowOf(number))).toBeNull();
    }

    await expect(workbench(canvas).getByRole('button', showMore)).toBeVisible();
    await expect(
      canvas.getByLabelText('CI Checks 3/5, 2 running'),
    ).toBeVisible();
    await expect(
      canvas.getByLabelText('CI Checks 4/5, 1 failing'),
    ).toBeVisible();
    await expect(canvas.getByLabelText('CI Checks 5/5, passed')).toBeVisible();
    await expect(
      consoleErrors.mock.calls
        .flat()
        .filter(
          (part) =>
            typeof part === 'string' &&
            part.includes('A props object containing a "key" prop'),
        ),
    ).toEqual([]);
  },
};

export const ShowMoreRevealsEveryChange: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await workbench(canvas).findByRole('button', showMore),
    );

    for (const number of [45, 44, 43, ...hiddenRows]) {
      await expect(canvas.getByRole('button', rowOf(number))).toBeVisible();
    }

    await expect(workbench(canvas).queryByRole('button', showMore)).toBeNull();
    await expect(workbench(canvas).getByRole('button', showLess)).toBeVisible();
  },
};

export const ShowLessGoesBackToThree: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await workbench(canvas).findByRole('button', showMore),
    );
    await userEvent.click(
      await workbench(canvas).findByRole('button', showLess),
    );

    await expect(canvas.getByRole('button', firstChange)).toBeVisible();

    for (const number of hiddenRows) {
      await expect(canvas.queryByRole('button', rowOf(number))).toBeNull();
    }

    await expect(workbench(canvas).getByRole('button', showMore)).toBeVisible();
  },
};

export const FewChangesNeedNoShowMore: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, severalPullRequests.slice(0, 3)),
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', firstChange)).toBeVisible();
    await expect(workbench(canvas).queryByRole('button', showMore)).toBeNull();
  },
};

export const DisclosureKeepsInspectorClosed: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Collapse Changes' }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole('button', firstChange)).toBeNull(),
    );
    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Changes' }),
    );
    await expect(canvas.getByRole('button', firstChange)).toBeVisible();
  },
};

// A row opens its own pull request on GitHub, and nothing in the Inspector.
export const RowPressOpensGitHub: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByText(firstTitle));
    await waitFor(() => expect(opened).toHaveBeenCalledTimes(1));
    await expect(opened.mock.calls[0]?.[0]).toBe(
      'https://github.com/owner/app/pull/45',
    );
    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
  },
};

export const RevealedRowPressOpensItsOwnAddress: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await workbench(canvas).findByRole('button', showMore),
    );
    await userEvent.click(await canvas.findByRole('button', rowOf(46)));
    await waitFor(() => expect(opened).toHaveBeenCalledTimes(1));
    await expect(opened.mock.calls[0]?.[0]).toBe(
      'https://github.com/owner/app/pull/46',
    );
  },
};

export const ChecksPopoverListsEachCheck: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: /CI Checks 3\/5/ }),
    );
    const popover = await screen.findByRole('dialog', { name: 'CI Checks' });

    for (const { name } of firstChecks) {
      await waitFor(() =>
        expect(within(popover).getByText(name)).toBeVisible(),
      );
    }

    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
    await expect(opened).not.toHaveBeenCalled();
  },
};
