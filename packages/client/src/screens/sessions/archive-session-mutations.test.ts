import { afterEach, describe, expect, it, vi } from 'vitest';
import { archiveSessions, type ArchivePort } from './archive-session-mutations';

const refused = 'Checkout is busy';

const archivedOne = 'Session archived';

interface Announcement {
  title: string;
  undo: () => void;
}

interface Failure {
  title: string;
  cause: unknown;
}

interface FakeServer {
  port: ArchivePort;
  archived: string[];
  restored: string[];
  refreshed: () => number;
  announcements: Announcement[];
  failures: Failure[];
}

// A Server that archives every Session except the ones it refuses, and records what it was asked.
function fakeServer(refusing: readonly string[] = []): FakeServer {
  const archived: string[] = [];
  const restored: string[] = [];
  const announcements: Announcement[] = [];
  const failures: Failure[] = [];
  const refresh = vi.fn<ArchivePort['refresh']>(() => Promise.resolve());

  const port: ArchivePort = {
    dropRows: vi.fn<ArchivePort['dropRows']>(),
    archive: (id) => {
      archived.push(id);

      return refusing.includes(id)
        ? Promise.reject(new Error(refused))
        : Promise.resolve();
    },
    unarchive: (id) => {
      restored.push(id);

      return Promise.resolve();
    },
    refresh,
    announce: (title, undo) => announcements.push({ title, undo }),
    fail: (title, cause) => failures.push({ title, cause }),
  };

  return {
    port,
    archived,
    restored,
    refreshed: () => refresh.mock.calls.length,
    announcements,
    failures,
  };
}

const settle = (): Promise<void> => new Promise((done) => setTimeout(done));

const withUndo = { offerUndo: true };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('archiveSessions', () => {
  it('says "Session archived" for one id, as a bulk Archive of one does', async () => {
    const server = fakeServer();

    archiveSessions(server.port, ['a'], withUndo);
    await settle();

    expect(server.announcements.map((toast) => toast.title)).toEqual([
      archivedOne,
    ]);
  });

  it('counts the Sessions for several ids, one call each', async () => {
    const server = fakeServer();

    archiveSessions(server.port, ['a', 'b', 'c'], withUndo);
    await settle();

    expect(server.announcements.map((toast) => toast.title)).toEqual([
      '3 Sessions archived',
    ]);
    expect(server.archived).toEqual(['a', 'b', 'c']);
  });

  it('reloads the list once after every Session has settled', async () => {
    const server = fakeServer(['b']);

    archiveSessions(server.port, ['a', 'b', 'c'], withUndo);
    await settle();

    expect(server.refreshed()).toBe(1);
  });

  it('offers no toast on phones, which asked first, and still tells the caller', async () => {
    const server = fakeServer();
    const onArchived = vi.fn<() => void>();

    archiveSessions(server.port, ['a'], { offerUndo: false, onArchived });
    await settle();

    expect(server.announcements).toEqual([]);
    expect(onArchived).toHaveBeenCalledTimes(1);
  });

  it('does nothing for no ids', async () => {
    const server = fakeServer();

    archiveSessions(server.port, [], withUndo);
    await settle();

    expect(server.archived).toEqual([]);
    expect(server.announcements).toEqual([]);
  });
});

describe('archiveSessions when the Server refuses some', () => {
  it('shows one failure that counts the refusals and says why', async () => {
    const server = fakeServer(['a', 'b']);

    archiveSessions(server.port, ['a', 'b', 'c'], withUndo);
    await settle();

    expect(server.failures).toEqual([
      { title: 'Couldn’t archive 2 Sessions', cause: new Error(refused) },
    ]);
  });

  it('names the one Session that was refused', async () => {
    const server = fakeServer(['a']);

    archiveSessions(server.port, ['a', 'b'], withUndo);
    await settle();

    expect(server.failures.map((failure) => failure.title)).toEqual([
      'Couldn’t archive the Session',
    ]);
  });

  it('restores only the Sessions that archived on Undo', async () => {
    const server = fakeServer(['b']);

    archiveSessions(server.port, ['a', 'b', 'c'], withUndo);
    await settle();
    server.announcements[0]?.undo();
    await settle();

    expect(server.restored).toEqual(['a', 'c']);
  });

  it('restores nothing on Undo when none archived', async () => {
    const server = fakeServer(['a']);

    archiveSessions(server.port, ['a'], withUndo);
    await settle();
    server.announcements[0]?.undo();
    await settle();

    expect(server.restored).toEqual([]);
  });
});
