import {
  isToolCallRunning,
  type SessionSnapshot,
  type ToolCallUpdate,
} from '@repo/contracts';
import {
  type FeedActivity,
  type FeedExploration,
  type FeedGroup,
  type FeedViewItem,
  feedItemKey,
} from './feed-view';
import { groupTitle } from './group-title';
import {
  explorationActions,
  type GroupRow,
  joinsExploration,
  liveTitleFor,
  needsGroupHeader,
  replacesLiveCall,
} from './grouping-rules';

function settleExploration(activity: FeedActivity): void {
  if (activity.type !== 'exploration') return;
  activity.title = activity.toolCalls.some(isToolCallRunning)
    ? 'Exploring'
    : 'Explored';
}

type LiveCall = Extract<FeedGroup, { state: 'open' }>['live'];

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
    if (row.sessionUpdate === 'notice') {
      this.activities.push({ type: 'row', row });
      return;
    }
    this.activities.push({ type: 'thought', row });
    this.noteThought(row.state);
  }

  private noteThought(state: GroupRow['state']): void {
    if (state === 'open') this.liveTitle = 'Thinking';
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
    this.activities.push({
      type: 'tool_call',
      row,
      ...(awaitingPermission ? { awaitingApproval: true } : {}),
    });
    if (!explorationActions(row).length) this.exploration = undefined;
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
        title: 'Explored',
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

  private groupState(): Pick<FeedGroup, 'state'> & { live?: LiveCall } {
    return this.liveTitle
      ? { state: 'open', ...(this.live ? { live: this.live } : {}) }
      : { state: 'settled' };
  }

  private reset(): void {
    this.activities = [];
    this.toolCalls = [];
    this.exploration = undefined;
    this.liveTitle = undefined;
    this.live = undefined;
  }
}
