import type { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { createRejectionCounter } from '@repo/machine-log';
import {
  hydrateStoredFeedRow,
  newestRows,
  type FeedRowWrite,
  readQueuedFeed,
} from '../../../feed';
import type { WriterActorRef } from '../../../storage';
import { readStoredHeaderRows } from './query';

type HeaderReadInput = {
  writer: WriterActorRef | undefined;
  sessionId: string;
  turnId: string | null;
  rows: Record<string, SessionUpdate>;
};

type HeaderReadResult = {
  rows: Record<string, SessionUpdate>;
  rejected: boolean;
};

export function createLiveHeaderRowsReader({
  database,
}: {
  database: Database;
}): (input: HeaderReadInput) => HeaderReadResult {
  const rejections = createRejectionCounter('sessions');

  return (input): HeaderReadResult =>
    new HeaderRowsRead(database, rejections, input).read();
}

class HeaderRowsRead {
  private rejected = false;
  public constructor(
    private readonly database: Database,
    private readonly rejections: ReturnType<typeof createRejectionCounter>,
    private readonly input: HeaderReadInput,
  ) {}

  public read(): HeaderReadResult {
    if (this.input.turnId === null) return { rows: {}, rejected: false };

    const parsed = this.candidates(this.input.turnId).flatMap(
      (row): SessionUpdate[] => this.parse(row),
    );

    return {
      rows: this.mergeRows(parsed),
      rejected: this.rejected,
    };
  }

  private mergeRows(parsed: SessionUpdate[]): Record<string, SessionUpdate> {
    return Object.fromEntries(
      newestRows(
        [...parsed, ...Object.values(this.input.rows)].filter(
          (row): boolean => row.turnId === this.input.turnId,
        ),
      ),
    );
  }

  private candidates(turnId: string): (FeedRowWrite | SessionUpdate)[] {
    const stored = readStoredHeaderRows({
      database: this.database,
      sessionId: this.input.sessionId,
      turnId,
    });

    const queued = readQueuedFeed(
      this.input.writer,
      this.input.sessionId,
    ).rows.filter((row): boolean => row.turnId === turnId);

    return unseenRows([...stored, ...queued], this.input.rows);
  }

  private parse(row: FeedRowWrite | SessionUpdate): SessionUpdate[] {
    if (!('payloadVersion' in row)) return [row];

    try {
      return [hydrateStoredFeedRow(this.input.sessionId, row)];
    } catch (error) {
      this.rejected = true;
      this.rejections.report('rejected live-header shape', error);

      return [];
    }
  }
}

function unseenRows(
  candidates: (FeedRowWrite | SessionUpdate)[],
  rows: Record<string, SessionUpdate>,
): (FeedRowWrite | SessionUpdate)[] {
  return [
    ...new Map(
      candidates.flatMap((row): [string, FeedRowWrite | SessionUpdate][] =>
        Object.hasOwn(rows, row.id) ? [] : [[`${row.id}/${row.revision}`, row]],
      ),
    ).values(),
  ];
}
