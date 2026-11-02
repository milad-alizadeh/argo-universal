import type { Argo, StorageResult } from '@argo/plugin-kit';
import {
  issueSessionsTable,
  sessionMethods,
  type IssueLink,
  type IssueSession,
} from './issue-sessions-store';

export type { IssueLink, IssueSession } from './issue-sessions-store';

// What the Plugin keeps of its own: which Sessions work on which Issue. Everything GitHub says lives in `useData`.
export type TrackerStorage = {
  // Connecting a Session to an Issue again leaves the first time it was attached.
  attachSession: (link: IssueLink) => Promise<void>;
  detachSession: (link: IssueLink) => Promise<void>;
  issueSessions: (
    issue: Omit<IssueLink, 'sessionId'>,
  ) => Promise<IssueSession[]>;
  // The Issues these Sessions are attached to, the most recent first.
  sessionLinks: (sessionIds: readonly string[]) => Promise<IssueLink[]>;
};

type Store = {
  argo: Argo;
  ensureTables: () => Promise<StorageResult[]>;
};

export function createTrackerStorage(argo: Argo): TrackerStorage {
  return sessionMethods({ argo, ensureTables: createTables(argo) });
}

// The Tracker choice and the page cache were this Plugin's own before it read GitHub through Argo.
const tableStatements = [
  'DROP TABLE IF EXISTS tracker_preferences',
  'DROP TABLE IF EXISTS view_cache',
  issueSessionsTable,
];

function createTables(argo: Argo): Store['ensureTables'] {
  let tables: Promise<StorageResult[]> | undefined;

  const run = (sql: string): Promise<StorageResult> =>
    argo.storage.execute({ sql, params: [], method: 'run' });

  return () => {
    tables ??= Promise.all(tableStatements.map((sql) => run(sql)));

    return tables;
  };
}
