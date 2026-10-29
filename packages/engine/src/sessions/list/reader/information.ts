import {
  SessionInfo,
  type SessionRecord,
  type SessionUpdate,
  type Turn,
  selectPlanRowWithLatestContent,
} from '@repo/contracts';
import { newestRows, readQueuedFeed } from '../../../feed';
import type { SessionActorRef } from '../../session-machine';
import { latestTurnOf } from '../../stored-turn';
import { toSessionInfo, type SessionInfoInput } from '../information';
import type { SessionListState } from '../state';
import { readStoredActivity } from './activity-query';
import type { ListReadInput } from './input';

type HeaderRead = ReturnType<ListReadInput['readLiveHeader']>;

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
    const result = this.project(changes, header);

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
      ...Object.values(this.memoryRows()),
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

  private header(): HeaderRead {
    const { row, turns, writer } = this.input;

    return this.input.readLiveHeader({
      sessionId: row.id,
      live: this.liveInput().live,
      latestTurn: (): Turn | undefined => latestTurnOf(turns, row.id),
      memoryRows: this.memoryRows(),
      writer,
    });
  }

  private memoryRows(): Record<string, SessionUpdate> {
    return this.feed()?.rows ?? {};
  }

  private project(
    changes: (SessionUpdate | undefined)[],
    header: HeaderRead,
  ): SessionListState[number] {
    const updates = activityUpdates(changes);

    return toSessionInfo(this.projectionInput(updates, header));
  }

  private projectionInput(
    updates: SessionUpdate[],
    header: HeaderRead,
  ): SessionInfoInput {
    return {
      shells: this.input.shellCounts.get(this.input.row.id),
      row: this.input.row,
      turns: this.input.turns,
      message: lastMessage(updates),
      plan: selectPlanRowWithLatestContent(updates),
      ...this.liveInput(),
      ...headerInput(header),
      children: this.children(),
    };
  }

  private children(): SessionRecord[] {
    return this.input.rows.filter(
      (child): boolean =>
        child.parentSessionId === this.input.row.id ||
        child.startedBySessionId === this.input.row.id,
    );
  }

  private liveInput(): Pick<SessionInfoInput, 'live' | 'feed'> {
    return {
      live: this.live ? this.live.context : null,
      feed: this.feed() ?? null,
    };
  }
}

function headerInput(
  read: HeaderRead,
): Pick<SessionInfoInput, 'liveHeader' | 'activeTurnId'> {
  return { liveHeader: read.header, activeTurnId: read.activeTurnId };
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
