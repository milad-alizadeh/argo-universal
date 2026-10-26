// What archiving needs from the screen: the list's cache, the Server's `session.archive` and `session.unarchive`, and the toasts.
export interface ArchivePort {
  // The rows leave every cached list at once, before the Server answers.
  dropRows: (ids: readonly string[]) => void;
  archive: (sessionId: string) => Promise<void>;
  unarchive: (sessionId: string) => Promise<void>;
  // Once the Server has answered, the list reloads without the rows, or with them again.
  refresh: () => Promise<void>;
  // The archived toast with Undo: desktop and the web only.
  announce: (title: string, undo: () => void) => void;
  // A failure says so in an error toast, under the Server's own words.
  fail: (title: string, cause: unknown) => void;
}

export interface ArchiveOptions {
  // Phones ask first and offer no Undo; desktop and the web archive at once and do.
  offerUndo: boolean;
  onArchived?: () => void;
}

const sessions = (count: number): string =>
  count < 2 ? 'the Session' : `${count} Sessions`;

// One id says "Session archived", even from a bulk Archive, so it never reads "1 Sessions archived".
const archivedTitle = (count: number): string =>
  count < 2 ? 'Session archived' : `${count} Sessions archived`;

const failedTitle = (action: 'archive' | 'restore', count: number): string =>
  `Couldn’t ${action} ${sessions(count)}`;

// One call per id, so a refused Session leaves the others alone. Returns the ids that went through; the rest share one failure toast.
async function sendEach(
  port: ArchivePort,
  action: 'archive' | 'restore',
  ids: readonly string[],
): Promise<string[]> {
  const send = action === 'archive' ? port.archive : port.unarchive;
  const results = await Promise.allSettled(ids.map((id) => send(id)));
  const failed = results.filter((result) => result.status === 'rejected');
  const [first] = failed;

  if (first) port.fail(failedTitle(action, failed.length), first.reason);

  return ids.filter((_, index) => results[index]?.status === 'fulfilled');
}

// Undo while the archived toast shows: only the Sessions that archived come back.
async function restore(
  port: ArchivePort,
  archived: Promise<string[]>,
): Promise<void> {
  const ids = await archived;

  if (ids.length === 0) return;

  await sendEach(port, 'restore', ids);
  await port.refresh();
}

// The archived toast on desktop and the web, and the caller told once the Sessions are sent.
function announceArchived(
  port: ArchivePort,
  sent: { count: number; archived: Promise<string[]> },
  { offerUndo, onArchived }: ArchiveOptions,
): void {
  if (offerUndo) {
    const undo = (): void => void restore(port, sent.archived);

    port.announce(archivedTitle(sent.count), undo);
  }

  onArchived?.();
}

/*
 * Archive the Sessions: the rows leave the list, `session.archive` goes out once per id, and whatever the Server says the list reloads once from it.
 */
export function archiveSessions(
  port: ArchivePort,
  ids: readonly string[],
  options: ArchiveOptions,
): void {
  if (ids.length === 0) return;

  port.dropRows(ids);

  const archived = sendEach(port, 'archive', ids);

  void archived.then(port.refresh);
  announceArchived(port, { count: ids.length, archived }, options);
}
