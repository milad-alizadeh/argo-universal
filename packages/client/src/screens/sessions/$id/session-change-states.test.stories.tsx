import type { ChangeStaleReason } from '@repo/contracts';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import type { DiscoveryResult } from '#features/sessions';
import { repositoryChanges } from '../../../features/sessions/components/session-pull-request.mocks';
import { ChangingSession } from './session-change-selection.test.mocks';
import {
  attach,
  ChangesTab,
  discover,
  refresh,
  RetryingTab,
  said,
  signIn,
  staleChange,
  unreadChanges,
} from './session-change-states.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangeStates',
  render: (): JSX.Element => <ChangesTab changes={[]} />,
  beforeEach: (): void => {
    discover.mockReset();
    refresh.mockClear();
    attach.mockClear();
    signIn.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Context = Parameters<NonNullable<Story['play']>>[0];

const title = 'Add the Inspector list';

const signInText = 'Sign in to refresh';

const findPullRequests = { name: 'Find pull requests' };

// The tab opens on its files; the Change segment is one press away, with or without a Change.
async function showChanges({ userEvent }: Context): Promise<void> {
  await userEvent.click(await screen.findByRole('button', { name: 'Change' }));
}

async function find(context: Context): Promise<void> {
  await showChanges(context);
  await context.userEvent.click(
    await screen.findByRole('button', findPullRequests),
  );
}

// A failure that signing in would mend leads to the Account's existing sign-in; any other has no such button.
async function leadsToSignIn(
  { userEvent }: Context,
  expected: boolean,
): Promise<void> {
  const button = screen.queryByRole('button', { name: 'Sign in to GitHub' });

  if (!expected) return expect(button).toBeNull();

  await userEvent.click(
    button ?? (await screen.findByRole('button', signInButton)),
  );
  await expect(signIn).toHaveBeenCalledTimes(1);
}

const signInButton = { name: 'Sign in to GitHub' };

const atWidth =
  (width: 'phone' | 'wide'): (() => Promise<void>) =>
  () =>
    settleLayout(width === 'phone' ? 'phone' : layoutWidths.wide);

// With no Change attached, the Changes section still holds the attach field and "Find pull requests".
function emptyEntry(width: 'phone' | 'wide'): Story {
  return {
    beforeEach: atWidth(width),
    play: async (context) => {
      await showChanges(context);
      await expect(
        await screen.findByRole('button', findPullRequests),
      ).toBeVisible();
      await expect(
        screen.getByRole('textbox', { name: 'Pull request' }),
      ).toBeVisible();
      await expect(
        screen.getByRole('button', { name: 'Attach' }),
      ).toBeVisible();
    },
  };
}

export const EmptyEntryDesktop = emptyEntry('wide');

export const EmptyEntryPhone = emptyEntry('phone');

// Pressing it runs discovery once, shows a pending label until the answer comes, then the answer.
function discovering(width: 'phone' | 'wide'): Story {
  return {
    beforeEach: atWidth(width),
    play: async (context) => {
      const pending = Promise.withResolvers<DiscoveryResult>();

      discover.mockReturnValue(pending.promise);
      await find(context);
      await expect(
        await screen.findByRole('button', { name: 'Finding pull requests…' }),
      ).toBeDisabled();
      pending.resolve(said('found', { count: 2 }));
      await expect(
        await screen.findByText(/Found 2 pull requests/),
      ).toBeVisible();
      await expect(discover).toHaveBeenCalledTimes(1);
      await expect(screen.getByRole('button', findPullRequests)).toBeEnabled();
    },
  };
}

export const DiscoverPendingThenFoundDesktop = discovering('wide');

export const DiscoverPendingThenFoundPhone = discovering('phone');

// Each answer has its own words, and a failure is never worded as none found or as Closed.
function answers(
  result: DiscoveryResult,
  text: RegExp,
  width: 'phone' | 'wide',
): Story {
  return {
    beforeEach: atWidth(width),
    play: async (context) => {
      discover.mockResolvedValue(result);
      await find(context);
      await expect(await screen.findByText(text)).toBeVisible();

      if (result.result === 'unavailable') {
        await expect(screen.queryByText(/No pull request/)).toBeNull();
        await expect(screen.queryByText(/Closed/)).toBeNull();
      }

      await leadsToSignIn(context, result.signIn);
    },
  };
}

export const DiscoverNoMatchDesktop = answers(
  said('no-match', { branch: 'feature/login' }),
  /No pull request has been opened from feature\/login/,
  'wide',
);

export const DiscoverNoMatchPhone = answers(
  said('no-match', { branch: 'feature/login' }),
  /No pull request has been opened from feature\/login/,
  'phone',
);

export const DiscoverBranchlessDesktop = answers(
  said('branchless'),
  /not on a branch/,
  'wide',
);

export const DiscoverBranchlessPhone = answers(
  said('branchless'),
  /not on a branch/,
  'phone',
);

export const DiscoverNotGithubDesktop = answers(
  said('not-github'),
  /not on GitHub/,
  'wide',
);

export const DiscoverNotGithubPhone = answers(
  said('not-github'),
  /not on GitHub/,
  'phone',
);

export const DiscoverUnavailableDesktop = answers(
  said('unavailable'),
  /Could not look on GitHub just now/,
  'wide',
);

export const DiscoverUnavailablePhone = answers(
  said('unavailable'),
  /Could not look on GitHub just now/,
  'phone',
);

export const DiscoverSignInDesktop = answers(
  said('unavailable', { signIn: true }),
  /sign in to GitHub again/,
  'wide',
);

export const DiscoverSignInPhone = answers(
  said('unavailable', { signIn: true }),
  /sign in to GitHub again/,
  'phone',
);

// The Workbench's row for a stale Change says so too, keeping its title.
export const WorkbenchRowShowsStale: Story = {
  parameters: { screenPreview: true },
  render: (): JSX.Element => (
    <ChangingSession initial={[staleChange('signIn')]} />
  ),
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(signInText)).toBeVisible();
    await expect(canvas.getByText(title)).toBeVisible();
  },
};

// A Change that could not be refreshed keeps its last data in the list and its detail, and says why.
function staleChange_(
  stale: ChangeStaleReason,
  short: string,
  width: 'phone' | 'wide',
): Story {
  return {
    render: (): JSX.Element => <ChangesTab changes={[staleChange(stale)]} />,
    beforeEach: atWidth(width),
    play: async (context) => {
      await showChanges(context);
      await expect(await screen.findByText(short)).toBeVisible();
      await expect(screen.getByText(title)).toBeVisible();

      await context.userEvent.click(
        screen.getByRole('button', { name: /^Show Change owner\/app#12,/ }),
      );
      await expect(
        await screen.findByText(
          stale === 'signIn'
            ? /Sign in to GitHub again to refresh/
            : /Could not refresh/,
        ),
      ).toBeVisible();
      await expect(screen.getByText(title)).toBeVisible();
      await expect(screen.queryByText('Closed')).toBeNull();
      await leadsToSignIn(context, stale === 'signIn');

      await context.userEvent.click(
        screen.getByRole('button', { name: 'Refresh' }),
      );
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    },
  };
}

export const StaleSignInDesktop = staleChange_('signIn', signInText, 'wide');

export const StaleSignInPhone = staleChange_('signIn', signInText, 'phone');

export const StaleFailedDesktop = staleChange_('failed', 'Out of date', 'wide');

export const StaleFailedPhone = staleChange_('failed', 'Out of date', 'phone');

// The list's Refresh runs `github.refresh`.
function refreshing(width: 'phone' | 'wide'): Story {
  return {
    render: (): JSX.Element => <ChangesTab changes={repositoryChanges} />,
    beforeEach: atWidth(width),
    play: async (context) => {
      await showChanges(context);
      await context.userEvent.click(
        await screen.findByRole('button', { name: 'Refresh' }),
      );
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    },
  };
}

export const RefreshDesktop = refreshing('wide');

export const RefreshPhone = refreshing('phone');

// Attached PRs that were never read are said, apart from an empty list, and Retry reads again.
function unreadNotice(width: 'phone' | 'wide'): Story {
  return {
    render: (): JSX.Element => (
      <ChangesTab changes={[]} unread={unreadChanges} />
    ),
    beforeEach: atWidth(width),
    play: async (context) => {
      await showChanges(context);
      await expect(
        await screen.findByText('2 pull requests could not be read'),
      ).toBeVisible();
      await expect(
        screen.getByText(/owner\/app#31, fork\/app#8/),
      ).toBeVisible();
      await context.userEvent.click(
        screen.getByRole('button', { name: 'Retry' }),
      );
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    },
  };
}

export const UnreadNoticeDesktop = unreadNotice('wide');

export const UnreadNoticePhone = unreadNotice('phone');

// A first read that failed for want of a sign-in is said, and a Retry that succeeds takes the notice away.
function retryClears(width: 'phone' | 'wide'): Story {
  return {
    render: (): JSX.Element => <RetryingTab />,
    beforeEach: atWidth(width),
    play: async (context) => {
      await showChanges(context);
      await expect(
        await screen.findByText('1 pull request could not be read'),
      ).toBeVisible();
      await expect(screen.getByText('owner/app#31')).toBeVisible();
      await context.userEvent.click(
        screen.getByRole('button', { name: 'Retry' }),
      );
      await waitFor(() =>
        expect(screen.queryByText(/could not be read/)).toBeNull(),
      );
      await expect(refresh).toHaveBeenCalledTimes(1);
    },
  };
}

export const UnreadNoticeClearsOnRetryDesktop = retryClears('wide');

export const UnreadNoticeClearsOnRetryPhone = retryClears('phone');
