import type { ChangeStaleReason } from '@repo/contracts';
import { type JSX, useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import {
  type ChangeActions,
  type DiscoveryResult,
  type SessionPullRequest,
  type UnreadChange,
  useSessionPanels,
} from '#features/sessions';
import { SessionInspector } from './session-inspector';

export const attach = fn<ChangeActions['attach']>(() => Promise.resolve(true));

export const detach = fn<ChangeActions['detach']>(() => Promise.resolve(true));

export const discover = fn<() => Promise<DiscoveryResult | undefined>>();

// A discovery answer with only what it says set.
export const said = (
  result: DiscoveryResult['result'],
  more: Partial<DiscoveryResult> = {},
): DiscoveryResult => ({
  result,
  count: 0,
  branch: '',
  signIn: false,
  ...more,
});

export const refresh = fn<() => Promise<void>>(() => Promise.resolve());

// Opens the Account's sign-in, as the App's Issue tracker page.
export const signIn = fn<() => void>();

// The Changes of a Session whose attached PR could not be refreshed; what it shows is what was last known.
export const staleChange = (stale: ChangeStaleReason): SessionPullRequest => ({
  stage: 'open',
  id: 'github:owner/app#12',
  repository: 'owner/app',
  number: 12,
  title: 'Add the Inspector list',
  mergeable: true,
  summary: { files: 4, additions: 40, deletions: 9 },
  stale,
});

export const unreadChanges: UnreadChange[] = [
  { repository: 'owner/app', number: 31, error: 'GitHub is unreachable' },
  { repository: 'fork/app', number: 8, error: 'GitHub is unreachable' },
];

const header = { title: 'Work', status: 'idle', startedAt: null } as const;

// The Session's Inspector on its Changes tab, with the controls the GitHub Plugin gives it; the width sets desktop or phone.
function Tab(props: {
  changes: readonly SessionPullRequest[];
  unread?: readonly UnreadChange[];
  // Replaces the harness's Refresh, as a read that then succeeds.
  onRefresh?: () => Promise<void>;
}): JSX.Element {
  const panels = useSessionPanels(['changes']);
  const [shown, setShown] = useState(false);

  if (!shown) {
    panels.select('changes');
    setShown(true);
  }

  return (
    <View className="h-175 w-full flex-row">
      <SessionInspector
        panels={panels}
        header={{ ...header, pullRequests: [...props.changes] }}
        changeActions={{
          attach,
          detach,
          discover,
          refresh: props.onRefresh ?? refresh,
          signIn,
          unread: props.unread ?? [],
        }}
      />
    </View>
  );
}

export const ChangesTab = Tab;

// The attached pull requests were never read for want of a sign-in; a Retry that succeeds reads them.
export function RetryingTab(): JSX.Element {
  const [unread, setUnread] = useState<readonly UnreadChange[]>(signInUnread);

  return (
    <Tab
      changes={[]}
      unread={unread}
      onRefresh={async () => {
        await refresh();
        setUnread([]);
      }}
    />
  );
}

export const signInUnread: UnreadChange[] = [
  {
    repository: 'owner/app',
    number: 31,
    error: 'Sign in to GitHub to read this pull request.',
  },
];
