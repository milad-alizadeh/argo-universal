import {
  isToolCallRunning,
  type SessionSnapshot,
  type ToolCallUpdate,
} from '@repo/contracts';
import { toolCallFacts } from './feed-row-facts';
import {
  type FeedActivity,
  type FeedExploration,
  type FeedGroup,
  type FeedToolCall,
  type FeedViewItem,
  feedItemKey,
} from './feed-view';
import { groupTitle } from './group-title';
import {
  type GroupRow,
  joinsExploration,
  liveTitleFor,
  needsGroupHeader,
  replacesLiveCall,
} from './grouping-rules';

function settleExploration(activity: FeedActivity): void {
  if (activity.type !== 'exploration') return;
  activity.state = activity.toolCalls.some(isToolCallRunning)
    ? 'open'
    : 'settled';
}

type LiveCall = Extract<FeedGroup, { state: 'open' }>['live'];

type GroupState = Pick<FeedGroup, 'state'> & { live?: LiveCall };

export class OpenGroup {
  private activities: FeedActivity[] = [];
  private toolCalls: ToolCallUpdate[] = [];
  private exploration: FeedExploration | undefined;
  private liveTitle: string | undefined;
  private live: LiveCall;
  private readonly snapshot: SessionSnapshot;

  public constructor(snapshot: SessionSnapshot) {
    this.snapshot = snapshot;
  }

  public add(row: GroupRow): void {
    if (row.sessionUpdate === 'tool_call_update') return this.addToolCall(row);

    // Thoughts keep their position in the projection; only the Live header draws their activity.
    this.activities.push(
      row.sessionUpdate === 'notice'
        ? { type: 'row', row }
        : { type: 'thought', row },
    );
  }

  private addToolCall(row: ToolCallUpdate): void {
    const awaitingPermission =
      row.toolCallId === this.snapshot.pendingPermission?.toolCallId;

    this.toolCalls.push(row);
    this.noteLiveCall(row, awaitingPermission);

    if (joinsExploration(row, awaitingPermission)) {
      this.addExploration(row);

      return;
    }

    this.addPlainCall(row, awaitingPermission);
  }

  private addPlainCall(row: ToolCallUpdate, awaitingPermission: boolean): void {
    const call: FeedToolCall = { type: 'tool_call', row };

    if (awaitingPermission) call.awaitingApproval = true;
    this.activities.push(call);

    if (!toolCallFacts(row).explores) this.exploration = undefined;
  }

  private noteLiveCall(row: ToolCallUpdate, awaitingPermission: boolean): void {
    if (
      !replacesLiveCall(row, {
        awaitingPermission,
        awaitingApproval: this.isAwaitingApproval(),
      })
    )
      return;
    this.live = { toolCall: row, awaitingApproval: awaitingPermission };
    this.liveTitle = liveTitleFor(row, awaitingPermission);
  }

  private isAwaitingApproval(): boolean {
    return this.live?.awaitingApproval ?? false;
  }

  private addExploration(row: ToolCallUpdate): void {
    if (!this.exploration) {
      this.exploration = {
        type: 'exploration',
        id: row.id,
        state: 'settled',
        toolCalls: [],
      };
      this.activities.push(this.exploration);
    }

    this.exploration.toolCalls.push(row);
  }

  public flush(): FeedViewItem[] {
    const first = this.activities[0];

    if (!first) return [];

    for (const activity of this.activities) settleExploration(activity);
    const items = this.groupItems(first);
    this.reset();

    return items;
  }

  private groupItems(first: FeedActivity): FeedViewItem[] {
    return needsGroupHeader(this.activities, this.toolCalls, this.liveTitle)
      ? [this.toGroup(first)]
      : this.activities;
  }

  private toGroup(first: FeedActivity): FeedGroup {
    return {
      type: 'group',
      id: feedItemKey(first),
      title: this.liveTitle ?? groupTitle(this.toolCalls),
      ...this.groupState(),
      items: this.activities,
    };
  }

  private groupState(): GroupState {
    if (!this.liveTitle) return { state: 'settled' };
    const open: GroupState = { state: 'open' };

    if (this.live) open.live = this.live;

    return open;
  }

  private reset(): void {
    this.activities = [];
    this.toolCalls = [];
    this.exploration = undefined;
    this.liveTitle = undefined;
    this.live = undefined;
  }
}
