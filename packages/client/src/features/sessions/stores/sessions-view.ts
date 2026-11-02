import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type DataTag,
  type QueryClient,
  queryOptions,
  type UnusedSkipTokenOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';
import { useServerScope } from '#lib/product/server-scope';

// By project lists each Project's Sessions under its heading; One list has no headings.
export const sessionsGroupChoices = [
  { value: 'project', label: 'By project', icon: 'folder' },
  { value: 'none', label: 'One list', icon: 'one-list' },
] as const;

// Each status with the `archived` filter `session.list` takes for it; All asks with none, for active and archived Sessions together.
export const sessionsStatusChoices = [
  { value: 'active', label: 'Active', icon: 'triage', archived: false },
  {
    value: 'archived',
    label: 'Archived',
    icon: 'archived',
    archived: true,
  },
  { value: 'all', label: 'All', icon: 'all-sessions', archived: undefined },
] as const;

export const sessionsLayoutChoices = [
  { value: 'regular', label: 'Regular', icon: 'regular-layout' },
  { value: 'compact', label: 'Compact', icon: 'compact-layout' },
] as const;

type ChoiceValue<Choices extends readonly { value: string }[]> =
  Choices[number]['value'];

type SessionsGroup = ChoiceValue<typeof sessionsGroupChoices>;

export type SessionsStatus = ChoiceValue<typeof sessionsStatusChoices>;

// Regular rows show the activity, metadata and Plan bar; Compact rows show one line each.
export type SessionsLayout = ChoiceValue<typeof sessionsLayoutChoices>;

// How the Sessions list groups, filters and lays out its rows; it always lists the most recently active Sessions first.
export interface SessionsView {
  group: SessionsGroup;
  status: SessionsStatus;
  layout: SessionsLayout;
}

export const defaultSessionsView: SessionsView = {
  group: 'project',
  status: 'active',
  layout: 'regular',
};

const viewChoices = {
  group: sessionsGroupChoices,
  status: sessionsStatusChoices,
  layout: sessionsLayoutChoices,
} as const;

const fields = ['group', 'status', 'layout'] as const;

export const isDefaultSessionsView = (view: SessionsView): boolean =>
  fields.every((field) => view[field] === defaultSessionsView[field]);

type ViewField = (typeof fields)[number];

const isChoice = <Field extends ViewField>(
  field: Field,
  value: unknown,
): value is SessionsView[Field] =>
  viewChoices[field].some((choice) => choice.value === value);

/*
 * The view is kept for one Server's Sessions, so a Device that looks at two Servers keeps a view for each (ADR-0022).
 */
const storageKey = (serverId: string): string => `${serverId}:sessions-view`;

// A kept field that is none of its choices, or missing, falls back to that field's default.
const keptField = <Field extends ViewField>(
  field: Field,
): z.ZodType<SessionsView[Field]> =>
  z
    .custom<SessionsView[Field]>((value) => isChoice(field, value))
    .catch(defaultSessionsView[field]);

// A kept view that is not an object at all falls back to the default view; unknown fields are dropped.
const KeptView = z
  .object({
    group: keptField('group'),
    status: keptField('status'),
    layout: keptField('layout'),
  })
  .catch(defaultSessionsView);

// A kept view that is not JSON falls back to the default view.
function keptView(saved: string): SessionsView {
  try {
    return KeptView.parse(JSON.parse(saved));
  } catch {
    return defaultSessionsView;
  }
}

// Writes run one after another, so the last choice is the one kept, and a read waits for them.
let writes = Promise.resolve();

async function load(serverId: string): Promise<SessionsView> {
  await writes;

  const saved = await AsyncStorage.getItem(storageKey(serverId));

  return saved === null ? defaultSessionsView : keptView(saved);
}

function loadFailed(cause: unknown): SessionsView {
  console.error('Could not load the Sessions view', cause);

  return defaultSessionsView;
}

type SessionsViewKey = readonly ['sessions-view', string];

type SessionsViewQuery = UnusedSkipTokenOptions<
  SessionsView,
  Error,
  SessionsView,
  SessionsViewKey
> & { queryKey: DataTag<SessionsViewKey, SessionsView, Error> };

// The view this Device kept; a failed read keeps the default.
export function sessionsViewQuery(serverId: string): SessionsViewQuery {
  return queryOptions({
    queryKey: ['sessions-view', serverId] as const,
    queryFn: () => load(serverId).catch(loadFailed),
    staleTime: Infinity,
    // This Device's storage answers while the Server is unreachable.
    networkMode: 'always',
  });
}

// Shows the choice at once, wins over a read still loading, and keeps it for the next App start.
export function chooseSessionsView(
  client: QueryClient,
  serverId: string,
  view: SessionsView,
): void {
  const { queryKey } = sessionsViewQuery(serverId);
  void client.cancelQueries({ queryKey, exact: true });
  client.setQueryData(queryKey, view);
  writes = writes
    .then(() =>
      AsyncStorage.setItem(storageKey(serverId), JSON.stringify(view)),
    )
    .catch(keepFailed);
}

function keepFailed(cause: unknown): void {
  console.error('Could not keep the Sessions view', cause);
}

// The Sessions list's view on this Device: the default until the kept one loads.
export function useSessionsView(): [
  SessionsView,
  (view: SessionsView) => void,
] {
  const client = useQueryClient();
  const serverId = useServerScope().id;
  const { data = defaultSessionsView } = useQuery(sessionsViewQuery(serverId));

  return [data, (view) => chooseSessionsView(client, serverId, view)];
}

// Whether the view this Device kept has loaded, so the list asks the Server for it and not for the default first.
export const useSessionsViewKept = (): boolean =>
  useQuery(sessionsViewQuery(useServerScope().id)).isSuccess;
