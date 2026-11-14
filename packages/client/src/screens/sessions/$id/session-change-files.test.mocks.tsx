import { type JSX, useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import type { FileDiff } from '#features/feed';
import {
  changeKey,
  type SessionPullRequest,
  useSessionPanels,
} from '#features/sessions';
import { recordedFile } from '../../../../mocks/feed-edit-mock';
import {
  type MemoryCatalog,
  memoryChanges,
} from '../../../features/changes/source/memory-changes.mocks';
import { repositoryChanges } from '../../../features/sessions/components/session-pull-request.mocks';
import type { ChangeFilesSource } from '../../plugins/change-files';
import { fewChanges, useMemoryChanges } from './session-changes.test.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { withPullRequests } from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';
import { SessionInspector } from './session-inspector';

// What each PR changes, as its own comparison; none of these paths is in the Session's Checkout.
export const ownedPath = '/pull/owner-app-12/inspector-list.ts';

export const ownedSecondPath = '/pull/owner-app-12/inspector-detail.ts';

export const forkedPath = '/pull/fork-app-12/fork-only.ts';

export const mergedPath = '/pull/owner-app-9/merged-work.ts';

// The Session's Checkout's own files, which no PR's list may show.
export const checkoutPath = '/repo/src/feed.ts';

export const unavailableMessage = 'GitHub answered 502.';

export const restoreLabel = 'Restore GitHub (harness)';

const fileAt = (path: string): FileDiff => ({
  ...recordedFile('agent-1'),
  path,
});

const catalogOf = (files: readonly FileDiff[]): MemoryCatalog => ({
  files: () => files,
});

const owned = catalogOf([fileAt(ownedPath), fileAt(ownedSecondPath)]);

const forked = catalogOf([fileAt(forkedPath)]);

const mergedFiles = [fileAt(mergedPath)];

// The Checkout's own Files list, as the Inspector shows it with no Change selected.
function useCheckout(): ReturnType<typeof useMemoryChanges> {
  return useMemoryChanges(fewChanges);
}

// GitHub fails until the harness restores it.
class Recovery {
  public recovered = false;

  public restore(): void {
    this.recovered = true;
  }
}

// A catalog read afresh on each call, as a Server is.
const failingUntilRestored = (recovery: Recovery): MemoryCatalog => ({
  files: () => (recovery.recovered ? mergedFiles : undefined),
  get loadError() {
    return recovery.recovered ? undefined : unavailableMessage;
  },
});

const sourceFor = (recovery: Recovery): ChangeFilesSource => {
  const sources = new Map<string, ReturnType<typeof memoryChanges>>();

  const catalogs = new Map([
    ['github:owner/app#12', owned],
    ['github:fork/app#12', forked],
    ['github:owner/app#9', failingUntilRestored(recovery)],
  ]);

  return (change: SessionPullRequest) => {
    const key = changeKey(change);
    const source =
      sources.get(key) ?? memoryChanges(catalogs.get(key) ?? owned);

    sources.set(key, source);

    return source;
  };
};

type Held = { recovery: Recovery; source: ChangeFilesSource };

const holdRecovery = (): Held => {
  const recovery = new Recovery();

  return { recovery, source: sourceFor(recovery) };
};

const idleHeader = { title: 'Work', status: 'idle', startedAt: null } as const;

const restoreButton = (recovery: Recovery): JSX.Element => (
  <button type="button" onClick={() => recovery.restore()}>
    {restoreLabel}
  </button>
);

// The Session page with each Change reading its files from its own comparison, one of which GitHub fails.
export function ChangeFilesSession(): JSX.Element {
  const [{ recovery, source }] = useState(holdRecovery);
  const checkout = useCheckout();

  const view = withPullRequests(
    idleSession,
    repositoryChanges.map((change) => ({ ...change })),
  );

  return (
    <>
      <FramedSessionPreview
        state="open"
        {...view}
        changes={checkout}
        changeFiles={source}
        changeActions={{
          attach: fn(),
          detach: fn(),
          discover: fn(),
          refresh: fn(),
          unread: [],
        }}
      />
      {restoreButton(recovery)}
    </>
  );
}

// The same Changes in a phone's sheet, which holds the Inspector's Changes tab.
export function ChangeFilesSheet(): JSX.Element {
  const [{ recovery, source }] = useState(holdRecovery);
  const checkout = useCheckout();
  const panels = useSessionPanels(['changes']);
  const [shown, setShown] = useState(false);

  if (!shown) {
    panels.select('changes');
    setShown(true);
  }

  return (
    <>
      <View className="h-175 w-full flex-row">
        <SessionInspector
          panels={panels}
          changes={checkout}
          header={{ ...idleHeader, pullRequests: [...repositoryChanges] }}
          changeFiles={source}
        />
      </View>
      {restoreButton(recovery)}
    </>
  );
}
