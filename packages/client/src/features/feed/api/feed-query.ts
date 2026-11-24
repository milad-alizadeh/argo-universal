const hourMs = 3_600_000;

// The subscription keeps a Feed current, so it never goes stale on a clock; it is kept long enough that a Session seen today opens from here.
const feedKeptMs = 24 * hourMs;

export const feedKeyPrefix = ['feed', 'window'] as const;

export const snapshotKeyPrefix = ['feed', 'snapshot'] as const;

export const viewKeyPrefix = ['feed', 'view'] as const;

// The merged window of one Session's Feed: its epoch, revision, rows, older history and Plan.
export const feedKey = (cacheId: string): readonly string[] => [
  ...feedKeyPrefix,
  cacheId,
];

// The Session's status snapshot, written beside its rows.
export const snapshotKey = (cacheId: string): readonly string[] => [
  ...snapshotKeyPrefix,
  cacheId,
];

// The view drawn from the window, kept so the next draw reuses the items that did not change.
export const viewKey = (cacheId: string): readonly string[] => [
  ...viewKeyPrefix,
  cacheId,
];

// Registered once on the App's QueryClient; the reducer already makes new objects only for rows that changed.
export const feedQueryDefaults = {
  staleTime: Infinity,
  gcTime: feedKeptMs,
  structuralSharing: false,
} as const;

// Snapshots are plain data, so an equal one keeps the held object.
export const snapshotQueryDefaults = {
  staleTime: Infinity,
  gcTime: feedKeptMs,
} as const;

export const feedPageSize = 150;
