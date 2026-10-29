import type { SessionRecord, SessionInfo } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { createLiveHeaderReader } from '../../live-header';
import { readQueuedSessionRows } from '../../session-storage/session-storage';
import { latestTurnOf } from '../../turns';
import type { WriterChange } from '../observation';
import type { SessionListState } from '../state';
import { readSessionInformation } from './information';
import type { ListReadInput, ListReaderOptions } from './input';
import { SessionListParents } from './parents';
import { readTurnSessionIds } from './turn-owner';
import { readListTurns } from './turn-rows';

type FamilyTurns = {
  children: SessionRecord[];
  turns: Parameters<typeof latestTurnOf>[0];
};

interface SessionListReader {
  readRows: (ids?: readonly string[]) => SessionListState;
  sessionIdsForChanges: (change: WriterChange) => string[];
  relatedSessionIds: (ids: readonly string[]) => string[];
}

export function createSessionListReader(
  options: ListReaderOptions,
): SessionListReader {
  const reader = new ListReader(options);

  return {
    readRows: (ids): SessionListState => reader.read(ids),
    relatedSessionIds: (ids): string[] => reader.related(ids),
    sessionIdsForChanges: (change): string[] => reader.changed(change),
  };
}

class ListReader {
  private readonly parents = new SessionListParents();
  private readonly rejections = createRejectionCounter('sessions');
  private readonly readHeader: ReturnType<typeof createLiveHeaderReader>;
  public constructor(private readonly options: ListReaderOptions) {
    this.readHeader = createLiveHeaderReader(options);
  }

  public read(sessionIds: readonly string[] | undefined): SessionListState {
    const input = this.readInput();
    const { rows, ids } = this.parents.readFamily(input, sessionIds);

    return rows
      .filter(
        (row): boolean =>
          row.parentSessionId === null && includesId(ids, row.id),
      )
      .flatMap((row): SessionListState => this.information(input, row, rows));
  }

  public related(ids: readonly string[]): string[] {
    return this.parents.related(ids);
  }

  public changed(change: WriterChange): string[] {
    return [
      ...new Set([
        ...change.sessionIds,
        ...change.turnIds.flatMap((id): string[] => this.turnOwner(id)),
      ]),
    ];
  }

  private turnOwner(turnId: string): string[] {
    return readTurnSessionIds({
      ...this.options,
      projection: readQueuedSessionRows(this.options.writer()),
      turnId,
      validate: <Value>(read: () => Value): Value | undefined =>
        this.validate(read),
    });
  }

  private readInput(): ListReadInput {
    return {
      database: this.options.database,
      writer: this.options.writer(),
      validate: <Value>(read: () => Value): Value | undefined =>
        this.validate(read),
      readLiveHeader: this.readHeader,
      rejectedSessions: new Set<string>(),
      shellCounts: new Map<string, SessionInfo['shells']>(),
    };
  }

  private validate<Value>(read: () => Value): Value | undefined {
    try {
      return read();
    } catch (error) {
      this.rejections.report('rejected list shape', error);

      return undefined;
    }
  }

  private information(
    input: ListReadInput,
    row: SessionRecord,
    rows: SessionRecord[],
  ): SessionListState {
    const children = rows.filter(
      (child): boolean =>
        child.parentSessionId === row.id || child.startedBySessionId === row.id,
    );

    const turns = familyTurns(input, row.id, children);

    if (!visibleSession(input, row.id, turns)) return [];

    const result = this.project(input, row, { children, turns });

    return result ? [result] : [];
  }

  private project(
    input: ListReadInput,
    row: SessionRecord,
    { children, turns }: FamilyTurns,
  ): SessionListState[number] | undefined {
    return readSessionInformation({
      ...input,
      actor: this.options.sessions.getSnapshot().context.sessions[row.id],
      turns,
      rows: children.filter(
        (child): boolean => !input.rejectedSessions.has(child.id),
      ),
      row,
    });
  }
}

function includesId(ids: Set<string> | undefined, id: string): boolean {
  return !ids || ids.has(id);
}

function visibleSession(
  input: ListReadInput,
  id: string,
  turns: Parameters<typeof latestTurnOf>[0],
): boolean {
  return !input.rejectedSessions.has(id) && Boolean(latestTurnOf(turns, id));
}

function familyTurns(
  input: ListReadInput,
  sessionId: string,
  children: SessionRecord[],
): Parameters<typeof latestTurnOf>[0] {
  return readListTurns(
    input,
    sessionId,
    children.map((child): string => child.id),
  );
}
