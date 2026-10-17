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

// Last activity sorts by `activityAt`, Created by `createdAt`, newest first either way.
export const sessionsOrderChoices = [
  { value: 'activity', label: 'Last activity' },
  { value: 'created', label: 'Created' },
] as const;

// By project lists each Project's Sessions under its heading; One list has no headings.
export const sessionsGroupChoices = [
  { value: 'project', label: 'By project' },
  { value: 'none', label: 'One list' },
] as const;

// Each status with the `archived` filter `session.list` takes for it; All asks with none, for active and archived Sessions together.
export const sessionsStatusChoices = [
  { value: 'active', label: 'Active', archived: false },
  { value: 'archived', label: 'Archived', archived: true },
  { value: 'all', label: 'All', archived: undefined },
] as const;

export const sessionsLayoutChoices = [
  { value: 'regular', label: 'Regular' },
  { value: 'compact', label: 'Compact' },
] as const;

type ChoiceValue<Choices extends readonly { value: string }[]> =
  Choices[number]['value'];

export type SessionsOrder = ChoiceValue<typeof sessionsOrderChoices>;

type SessionsGroup = ChoiceValue<typeof sessionsGroupChoices>;

export type SessionsStatus = ChoiceValue<typeof sessionsStatusChoices>;

// Regular rows show the activity, metadata and Plan bar; Compact rows show one line each.
export type SessionsLayout = ChoiceValue<typeof sessionsLayoutChoices>;

// How the Sessions list orders, groups, filters and lays out its rows.
export interface SessionsView {
  order: SessionsOrder;
  group: SessionsGroup;
  status: SessionsStatus;
  layout: SessionsLayout;
}

export const defaultSessionsView: SessionsView = {
  order: 'activity',
  group: 'project',
  status: 'active',
  layout: 'regular',
};

const viewChoices = {
  order: sessionsOrderChoices,
  group: sessionsGroupChoices,
  status: sessionsStatusChoices,
  layout: sessionsLayoutChoices,
} as const;

const fields = ['order', 'group', 'status', 'layout'] as const;

export const isDefaultSessionsView = (view: SessionsView): boolean =>
  fields.every((field) => view[field] === defaultSessionsView[field]);

type ViewField = (typeof fields)[number];

const isChoice = <Field extends ViewField>(
  field: Field,
  value: unknown,
): value is SessionsView[Field] =>
  viewChoices[field].some((choice) => choice.value === value);

const storageKey = 'sessions-view';

// Before the whole view was kept, this Device kept only its layout, as a bare value.
const layoutStorageKey = 'sessions-layout';

// A kept field that is none of its choices, or missing, falls back to that field's default.
const keptField = <Field extends ViewField>(
  field: Field,
): z.ZodType<SessionsView[Field]> =>
  z
    .custom<SessionsView[Field]>((value) => isChoice(field, value))
    .catch(defaultSessionsView[field]);

// A kept view that is not an object at all falls back to the default view.
const KeptView = z
  .object({
    order: keptField('order'),
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

async function load(): Promise<SessionsView> {
  await writes;

  const saved = await AsyncStorage.getItem(storageKey);

  if (saved !== null) return keptView(saved);

  return KeptView.parse({
    layout: await AsyncStorage.getItem(layoutStorageKey),
  });
}

function loadFailed(cause: unknown): SessionsView {
  console.error('Could not load the Sessions view', cause);

  return defaultSessionsView;
}

type SessionsViewKey = readonly ['sessions-view'];

type SessionsViewQuery = UnusedSkipTokenOptions<
  SessionsView,
  Error,
  SessionsView,
  SessionsViewKey
> & { queryKey: DataTag<SessionsViewKey, SessionsView, Error> };

// The view this Device kept; a failed read keeps the default.
export function sessionsViewQuery(): SessionsViewQuery {
  return queryOptions({
    queryKey: ['sessions-view'] as const,
    queryFn: () => load().catch(loadFailed),
    staleTime: Infinity,
    // This Device's storage answers while the Server is unreachable.
    networkMode: 'always',
  });
}

// Shows the choice at once, wins over a read still loading, and keeps it for the next App start.
export function chooseSessionsView(
  client: QueryClient,
  view: SessionsView,
): void {
  const { queryKey } = sessionsViewQuery();
  void client.cancelQueries({ queryKey, exact: true });
  client.setQueryData(queryKey, view);
  writes = writes.then(() => keepView(view)).catch(keepFailed);
}

// The whole view replaces the layout kept on its own before.
async function keepView(view: SessionsView): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(view));
  await AsyncStorage.removeItem(layoutStorageKey);
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
  const { data = defaultSessionsView } = useQuery(sessionsViewQuery());

  return [data, (view) => chooseSessionsView(client, view)];
}

// Whether the view this Device kept has loaded, so the list asks the Server for it and not for the default first.
export const useSessionsViewKept = (): boolean =>
  useQuery(sessionsViewQuery()).isSuccess;
