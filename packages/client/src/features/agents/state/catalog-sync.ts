import type { AgentsCatalogOutput } from '@repo/contracts';

export type CatalogLoad =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'loaded'; catalog: AgentsCatalogOutput };
export type SavedCatalog = {
  catalog: AgentsCatalogOutput | undefined;
  error: string | null;
};
export type CatalogRefresh = { pending: boolean; error: string | null };
export type CatalogSync = { load: CatalogLoad; refreshing: boolean };

const syncingStatuses = new Set<AgentsCatalogOutput['syncStatus']>([
  'pending',
  'running',
]);

// A refused refresh keeps the saved Agents and says why they may be out of date.
function withRefreshError(
  catalog: AgentsCatalogOutput,
  error: string | null,
): AgentsCatalogOutput {
  if (error === null) return catalog;
  const status = catalog.fetchedAt === null ? 'unavailable' : 'stale';
  return { ...catalog, status, error };
}

function loadCatalog(
  saved: SavedCatalog,
  refreshError: string | null,
): CatalogLoad {
  if (saved.catalog)
    return {
      status: 'loaded',
      catalog: withRefreshError(saved.catalog, refreshError),
    };
  if (saved.error !== null) return { status: 'failed', message: saved.error };
  return { status: 'loading' };
}

export function applyCatalogSync(
  saved: SavedCatalog,
  refresh: CatalogRefresh,
): CatalogSync {
  const syncing = saved.catalog
    ? syncingStatuses.has(saved.catalog.syncStatus)
    : false;
  return {
    load: loadCatalog(saved, refresh.error),
    refreshing: refresh.pending || syncing,
  };
}
