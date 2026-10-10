import type { AgentInfo, SessionSnapshot } from '@repo/contracts';
import {
  type FeedMock,
  newSessionCatalogs,
  recordedFeedMocks,
} from '@repo/mocks/app';
import { PortalHost } from '@rn-primitives/portal';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { findLiveToolCall, toFeedView } from '#features/feed';
import { useWide } from '../../../lib/generic/use-wide';
import {
  recordedFeedMock,
  recordedImageUrl,
} from '../../../lib/product/feed-message.mocks';
import { detailActionsHost, detailHeaderHost } from './session-header';
import type { OpenSessionViewProps } from './session-view';

// Each recording's Agent in the catalog: agent-1 is the first entry, agent-2 the second.
function catalogAgentOf(mock: FeedMock): AgentInfo {
  const agent = newSessionCatalogs.bothAvailable.at(
    mock.agent === 'agent-1' ? 0 : 1,
  );
  if (!agent) throw new Error(`No catalog Agent for ${mock.agent}`);
  return agent;
}

const editAndCommand = recordedFeedMock('agent-1', 'edit-and-command');
const recordedHeader = editAndCommand.liveHeaders.findLast(
  (header) => header.startedAt !== null && header.source.type === 'tool_call',
);
if (!recordedHeader) throw new Error('No running live header recorded');
export const runningHeader = recordedHeader;

// A clock four minutes and twelve seconds into the running Turn.
const runningTurnNow = (runningHeader.startedAt ?? 0) + 252_000;

// An open Session's props from a recording, through the real Feed converter.
function openSessionProps(
  mock: FeedMock,
  snapshotChanges: Partial<SessionSnapshot> = {},
): OpenSessionViewProps {
  const snapshot = { ...mock.snapshot, ...snapshotChanges };
  const view = toFeedView(mock.rows, snapshot);
  const { liveHeader } = snapshot;
  const catalogAgent = catalogAgentOf(mock);
  return {
    header: {
      title: snapshot.title,
      status: snapshot.state === 'idle' ? 'idle' : 'running',
      startedAt: liveHeader?.startedAt ?? null,
      now: runningTurnNow,
    },
    feed: {
      items: view.items,
      liveHeader,
      liveToolCall: findLiveToolCall(mock.rows, snapshot),
      loadingOlder: false,
      onStartReached: fn(),
      imageUrl: recordedImageUrl,
      checkoutBranch: snapshot.checkout.branch ?? undefined,
      now: runningTurnNow,
    },
    cancelCreation: { disabled: false, onCancel: fn() },
    composer: {
      draft: { text: '', images: [] },
      onDraftChange: fn(),
      onAttachImages: fn(),
      onSend: fn(),
      onStop: fn(),
      configuration: {
        agents: newSessionCatalogs.bothAvailable,
        agent: catalogAgent.agent,
        configOptions: catalogAgent.configOptions,
        onConfigChange: fn(),
        turnRunning: snapshot.state !== 'idle',
        checkout: {
          branch: snapshot.checkout.branch ?? '',
          newWorktree: snapshot.checkout.type === 'worktree',
          path: snapshot.checkout.path,
        },
      },
    },
  };
}

export const runningSession = openSessionProps(editAndCommand, {
  state: 'running',
  liveHeader: runningHeader,
  activeTurnId: 'turn-running',
});

export const idleSession = openSessionProps(
  recordedFeedMock('agent-2', 'markdown-answer'),
);

export const emptySession = openSessionProps(
  { ...editAndCommand, rows: [] },
  { title: 'New Session' },
);

// Every recording in turn, so the Feed scrolls.
export const longSession = openSessionProps({
  ...editAndCommand,
  rows: recordedFeedMocks.flatMap((mock, copy) =>
    mock.rows.map((row) => ({
      ...row,
      id: `${copy}-${row.id}`,
      position: copy * 1000 + row.position,
      ...('toolCallId' in row
        ? { toolCallId: `${copy}-${row.toolCallId}` }
        : {}),
    })),
  ),
});

// The wide shell's detail header slots, which the Session header fills.
export function DetailHeaderSlots({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const wide = useWide();
  return (
    <View className="w-full flex-1 bg-background" style={{ minHeight: 0 }}>
      {wide && (
        <View className="h-shell-bar flex-row items-center gap-2 px-4">
          <View className="min-w-0 flex-1">
            <PortalHost name={detailHeaderHost} />
          </View>
          <View className="flex-row items-center gap-0.5">
            <PortalHost name={detailActionsHost} />
          </View>
        </View>
      )}
      {children}
    </View>
  );
}
