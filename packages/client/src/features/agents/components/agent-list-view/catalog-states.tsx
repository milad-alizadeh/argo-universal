import type { AgentsCatalogOutput } from '@repo/contracts';
import type { FieldListSection } from '#lib/product/field-list/field-list';
import { ListItem } from '#primitives/lists/list-item/list-item-view';
import {
  type ErrorToast,
  useErrorToast,
} from '#primitives/overlays/toast/toast';
import type { AgentRowEntry } from '../../state/agent-status';
import type { CatalogLoad } from '../../state/catalog-sync';
import { agentRows } from '../agent-list-item/agent-list-item';

export type LoadingSectionProps = {
  installed: readonly AgentRowEntry[];
  // The Server's platform, once a catalog has named it.
  platform?: string;
  onOpenAgent: (agentId: string) => void;
};

const groupTitle = (platform?: string): string =>
  platform ? `Agents for this Server · ${platform}` : 'Agents for this Server';

// One "Agents for this Server" group until the registry's Agents arrive: the installed rows, then a loading row.
export const catalogLoadingSection = (
  props: LoadingSectionProps,
): FieldListSection => ({
  title: groupTitle(props.platform),
  rows: [
    ...agentRows(props.installed, props.onOpenAgent),
    <ListItem key="loading" title="Loading the Agent catalog…" loading />,
  ],
});

// Nothing to list: no Agent matches the search, or none at all.
export function catalogEmptySection(props: {
  platform: string;
  search: string;
}): FieldListSection {
  const empty = emptyText(props.search.trim());

  return {
    title: groupTitle(props.platform),
    footer: empty.footer,
    rows: [<ListItem key="empty" title={empty.title} />],
  };
}

const emptyText = (search: string): { title: string; footer?: string } =>
  search
    ? { title: `No Agents match “${search}”`, footer: 'Check the spelling.' }
    : { title: 'No Agents found.' };

const loadFailed: ErrorToast = {
  title: 'Couldn’t load the Agent catalog',
  message: 'The Server didn’t respond. Check that it’s running.',
};

function refreshFailed(error: string | null): ErrorToast {
  const toast: ErrorToast = { title: 'Refresh failed · showing saved catalog' };

  if (error) toast.message = error;

  return toast;
}

const noSavedCatalog = (error: string | null): ErrorToast => ({
  title: 'Couldn’t load the registry',
  message: ['No saved catalog yet.', error].filter(Boolean).join(' '),
});

function savedCatalogToast({
  status,
  error,
}: AgentsCatalogOutput): ErrorToast | undefined {
  if (status === 'fresh') return undefined;

  return status === 'stale' ? refreshFailed(error) : noSavedCatalog(error);
}

function catalogToast(load: CatalogLoad): ErrorToast | undefined {
  if (load.status === 'loaded') return savedCatalogToast(load.catalog);

  return load.status === 'failed' ? loadFailed : undefined;
}

// Each catalog failure shows a toast once; the list keeps its rows, or its loading row, and retries on its own.
export function useCatalogErrorToast(load: CatalogLoad): void {
  useErrorToast(catalogToast(load));
}
