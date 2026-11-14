import type { UnreadChange } from '#features/sessions';
import { unreadOf } from './change-outcomes';
import type { OperationRunner } from './page-calls-ports';
import type { ChangesContext } from './use-session-pull-requests';

// What reads the attached pull requests that were never read, and keeps only the newest reading's answer.
export interface UnreadReader {
  // Reads `github.list` again; a failed or unreadable answer leaves what is known.
  reload: () => Promise<void>;
  // An answer already in hand, such as a refresh's; an older reading still in flight is dropped. Nothing leaves what is known.
  set: (unread: UnreadChange[] | undefined) => void;
  // Drops any reading in flight, for a Session that has gone or a page that has closed.
  cancel: () => void;
}

// `github.list` for the Session; a failed read says nothing, so what is known stays.
export async function readUnread(
  run: OperationRunner['run'],
  session: ChangesContext,
): Promise<UnreadChange[] | undefined> {
  try {
    const list = { pluginId: 'github', operation: 'list', args: {} };

    return unreadOf((await run({ ...list, ...session })).result);
  } catch {
    return undefined;
  }
}

/*
 * Each reading takes a ticket, and only the latest ticket may publish: a slow first `list` can never overwrite what a
 * refresh or a later `list` has already said.
 */
class Tickets implements UnreadReader {
  private latest = 0;

  constructor(
    private readonly read: () => Promise<UnreadChange[] | undefined>,
    private readonly publish: (unread: UnreadChange[]) => void,
  ) {}

  private accept(ticket: number, unread: UnreadChange[] | undefined): void {
    if (ticket === this.latest && unread) this.publish(unread);
  }

  reload = async (): Promise<void> => {
    this.latest += 1;

    const ticket = this.latest;

    this.accept(ticket, await this.read());
  };

  set = (unread: UnreadChange[] | undefined): void => {
    this.latest += 1;
    this.accept(this.latest, unread);
  };

  cancel = (): void => {
    this.latest += 1;
  };
}

export const createUnreadReader = (
  read: () => Promise<UnreadChange[] | undefined>,
  publish: (unread: UnreadChange[]) => void,
): UnreadReader => new Tickets(read, publish);
