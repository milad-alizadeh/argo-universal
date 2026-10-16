import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type DataTag,
  type QueryClient,
  queryOptions,
  type UnusedSkipTokenOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export const sessionsLayoutChoices = [
  { value: 'regular', label: 'Regular', icon: 'layout-regular' },
  { value: 'compact', label: 'Compact', icon: 'layout-compact' },
] as const;

// Regular rows show the activity, metadata and Plan bar; Compact rows show one line each.
export type SessionsLayout = (typeof sessionsLayoutChoices)[number]['value'];

const storageKey = 'sessions-layout';

export const isSessionsLayout = (
  value: string | null,
): value is SessionsLayout =>
  sessionsLayoutChoices.some((choice) => choice.value === value);

// Writes run one after another, so the last choice is the one kept, and a read waits for them.
let writes = Promise.resolve();

async function load(): Promise<SessionsLayout> {
  await writes;

  const saved = await AsyncStorage.getItem(storageKey);

  return isSessionsLayout(saved) ? saved : 'regular';
}

function loadFailed(cause: unknown): SessionsLayout {
  console.error('Could not load the Sessions layout', cause);

  return 'regular';
}

type SessionsLayoutKey = readonly ['sessions-layout'];

type SessionsLayoutQuery = UnusedSkipTokenOptions<
  SessionsLayout,
  Error,
  SessionsLayout,
  SessionsLayoutKey
> & { queryKey: DataTag<SessionsLayoutKey, SessionsLayout, Error> };

// The layout this Device kept; a failed read stays Regular.
export function sessionsLayoutQuery(): SessionsLayoutQuery {
  return queryOptions({
    queryKey: ['sessions-layout'] as const,
    queryFn: () => load().catch(loadFailed),
    staleTime: Infinity,
  });
}

// Shows the choice at once, wins over a read still loading, and keeps it for the next App start.
export function chooseSessionsLayout(
  client: QueryClient,
  layout: SessionsLayout,
): void {
  const { queryKey } = sessionsLayoutQuery();
  void client.cancelQueries({ queryKey, exact: true });
  client.setQueryData(queryKey, layout);
  writes = writes
    .then(() => AsyncStorage.setItem(storageKey, layout))
    .catch(keepFailed);
}

function keepFailed(cause: unknown): void {
  console.error('Could not keep the Sessions layout', cause);
}

// The Sessions list's layout on this Device: Regular until the kept one loads.
export function useSessionsLayout(): [
  SessionsLayout,
  (layout: SessionsLayout) => void,
] {
  const client = useQueryClient();
  const { data = 'regular' } = useQuery(sessionsLayoutQuery());

  return [data, (layout) => chooseSessionsLayout(client, layout)];
}
