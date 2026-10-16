import {
  SessionInfo,
  type SessionRecord,
  type SessionUpdate,
  type Turn,
  selectPlanRowWithLatestContent,
} from '@repo/contracts';
import { newestRows, readQueuedFeed } from '../../../feed';
import type { SessionActorRef } from '../../session-machine';
import { toSessionInfo, type SessionInfoInput } from '../information';
import type { SessionListState } from '../state';
import { latestTurnOf } from '../turns';
import { readStoredActivity } from './activity-query';
import type { ListReadInput } from './input';

type InformationInput = ListReadInput & {
  actor: SessionActorRef | undefined;
  row: SessionRecord;
  rows: readonly SessionRecord[];
  turns: readonly Turn[];
};

export function readSessionInformation(
  input: InformationInput,
): SessionListState[number] | undefined {
  return new SessionInformationRead(input).read();
}

class SessionInformationRead {
  private readonly live: ReturnType<SessionActorRef['getSnapshot']> | undefined;
  public constructor(private readonly input: InformationInput) {
    this.live = input.actor?.getSnapshot();
  }

  public read(): SessionListState[number] | undefined {
    const changes = this.changes();
    const header = this.header();
    const result = this.project(changes, Object.values(header.rows));

    const listed = rejectedActivity(changes, header.rejected)
      ? { ...result.information, activity: '', plan: null }
      : result.information;

    const information = this.input.validate((): SessionInfo =>
      SessionInfo.parse(listed),
    );

    return information ? { information, running: result.running } : undefined;
  }

  private changes(): (SessionUpdate | undefined)[] {
    const { writer, row } = this.input;

    return [
      ...readStoredActivity(this.input, row.id),
      ...readQueuedFeed(writer, row.id).rows,
      ...Object.values(this.feed()?.rows ?? {}),
    ];
  }

  private feed():
    | ReturnType<
        NonNullable<
          NonNullable<typeof this.live>['children']['feed']
        >['getSnapshot']
      >['context']
    | undefined {
    return this.live?.children.feed?.getSnapshot().context;
  }

  private header(): ReturnType<ListReadInput['readLiveHeaderRows']> {
    return this.input.readLiveHeaderRows({
      writer: this.input.writer,
      sessionId: this.input.row.id,
      turnId: this.activeTurnId(),
      rows: this.feed()?.rows ?? {},
    });
  }

  private activeTurnId(): string | null {
    return this.live?.context.activeTurnId ?? this.storedTurnId();
  }

  private storedTurnId(): string | null {
    const latest = latestTurnOf(this.input.turns, this.input.row.id);

    if (this.live) return null;

    return runningTurnId(latest);
  }

  private project(
    changes: (SessionUpdate | undefined)[],
    liveHeaderRows: SessionUpdate[],
  ): SessionListState[number] {
    const updates = activityUpdates(changes);

    return toSessionInfo(this.projectionInput(updates, liveHeaderRows));
  }

  private projectionInput(
    updates: SessionUpdate[],
    liveHeaderRows: SessionUpdate[],
  ): SessionInfoInput {
    return {
      shells: this.input.shellCounts.get(this.input.row.id),
      row: this.input.row,
      turns: this.input.turns,
      message: lastMessage(updates),
      plan: selectPlanRowWithLatestContent(updates),
      ...this.liveInput(),
      liveHeaderRows,
      children: this.children(),
    };
  }

  private children(): SessionRecord[] {
    return this.input.rows.filter(
      (child): boolean => child.parentSessionId === this.input.row.id,
    );
  }

  private liveInput(): Pick<SessionInfoInput, 'live' | 'feed'> {
    return {
      live: this.live ? this.live.context : null,
      feed: this.feed() ?? null,
    };
  }
}

function activityUpdates(
  changes: (SessionUpdate | undefined)[],
): SessionUpdate[] {
  return [
    ...newestRows(
      changes.filter((row): row is SessionUpdate => row !== undefined),
    ).values(),
  ].sort((first, second): number => first.position - second.position);
}

function lastMessage(updates: SessionUpdate[]): SessionInfoInput['message'] {
  return updates.findLast(
    (
      update,
    ): update is Extract<SessionUpdate, { sessionUpdate: 'agent_message' }> =>
      update.sessionUpdate === 'agent_message',
  );
}

function rejectedActivity(
  changes: (SessionUpdate | undefined)[],
  headerRejected: boolean,
): boolean {
  return changes.includes(undefined) || headerRejected;
}

function runningTurnId(latest: Turn | undefined): string | null {
  return latest?.status === 'running' ? latest.id : null;
}
