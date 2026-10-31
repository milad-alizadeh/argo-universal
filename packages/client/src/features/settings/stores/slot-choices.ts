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

/*
 * What this Device chose for one Slot: the Plugins it turned off, by Plugin id, and the Plugin that writes its
 * Single-owner Slot, or null while it is Argo's. A Plugin is on until it is listed, so a Plugin installed later
 * shows in the Slot without a visit to Settings.
 */
export interface SlotChoices {
  hidden: readonly string[];
  owner: string | null;
}

const argoChoices: SlotChoices = { hidden: [], owner: null };

/*
 * The choices are about one Server's Plugins, so a Device that looks at two Servers keeps a choice for each: a Plugin
 * turned off on one Server stays on in the other (ADR-0022).
 */
const storageKey = (serverId: string, slotId: string): string =>
  `${serverId}:slot-choices:${slotId}`;

// Anything kept that does not read as the choices falls back to Argo's own: every Plugin shown, Argo's line.
const Kept = z
  .object({
    hidden: z.array(z.string()).catch([]),
    owner: z.string().nullable().catch(null),
  })
  .catch(() => ({ hidden: [], owner: null }));

function keptChoices(saved: string | null): SlotChoices {
  if (saved === null) return argoChoices;

  try {
    return Kept.parse(JSON.parse(saved));
  } catch {
    return argoChoices;
  }
}

// Writes run one after another, so the last choice is the one kept, and a read waits for them.
let pendingWrites = Promise.resolve();

async function readKept(
  serverId: string,
  slotId: string,
): Promise<SlotChoices> {
  await pendingWrites;

  return keptChoices(await AsyncStorage.getItem(storageKey(serverId, slotId)));
}

function readFailed(cause: unknown): SlotChoices {
  console.error('Could not load the Slot choices', cause);

  return argoChoices;
}

type ChoicesKey = readonly ['slot-choices', string, string];

type ChoicesQuery = UnusedSkipTokenOptions<
  SlotChoices,
  Error,
  SlotChoices,
  ChoicesKey
> & { queryKey: DataTag<ChoicesKey, SlotChoices, Error> };

// This Device's choices for one Slot; a failed read is Argo's own.
export function slotChoicesQuery(
  serverId: string,
  slotId: string,
): ChoicesQuery {
  return queryOptions({
    queryKey: ['slot-choices', serverId, slotId] as const,
    queryFn: () => readKept(serverId, slotId).catch(readFailed),
    staleTime: Infinity,
    // This Device's storage answers while the Server is unreachable.
    networkMode: 'always',
  });
}

type Change = (choices: SlotChoices) => SlotChoices;

// Builds on the kept choices once they have loaded, so an earlier choice is never lost, then shows and keeps the result.
async function choose(
  client: QueryClient,
  server: ServerSlot,
  change: Change,
): Promise<void> {
  const options = slotChoicesQuery(server.serverId, server.slotId);
  const loaded = await client.query(options);
  // A choice made while this one waited for the load is already in the cache.
  const next = change(client.getQueryData(options.queryKey) ?? loaded);

  client.setQueryData(options.queryKey, next);
  keep(server, next);
}

// One Slot on one Server, which is what a choice is about.
interface ServerSlot {
  serverId: string;
  slotId: string;
}

function keep({ serverId, slotId }: ServerSlot, choices: SlotChoices): void {
  pendingWrites = pendingWrites
    .then(() =>
      AsyncStorage.setItem(
        storageKey(serverId, slotId),
        JSON.stringify(choices),
      ),
    )
    .catch(keepFailed);
}

function keepFailed(cause: unknown): void {
  console.error('Could not keep the Slot choices', cause);
}

const withShown =
  (pluginId: string, shown: boolean): Change =>
  (choices) => {
    const others = choices.hidden.filter((id) => id !== pluginId);

    return { ...choices, hidden: shown ? others : [...others, pluginId] };
  };

// Turns one Plugin on or off in one Slot on this Device.
export const chooseSlotPluginShown = (
  client: QueryClient,
  server: ServerSlot,
  { pluginId, shown }: { pluginId: string; shown: boolean },
): Promise<void> => choose(client, server, withShown(pluginId, shown));

// Hands the Slot's Single-owner Slot to one Plugin, or back to Argo with null.
export const chooseSlotOwner = (
  client: QueryClient,
  server: ServerSlot,
  owner: string | null,
): Promise<void> =>
  choose(client, server, (choices) => ({ ...choices, owner }));

/*
 * This Device's choices for one Slot: Argo's own until the kept ones load. A Slot reads this to leave out a hidden
 * Plugin, and to find who writes its Single-owner Slot.
 */
export function useSlotChoices(slotId: string): SlotChoices {
  const { data = argoChoices } = useQuery(
    slotChoicesQuery(useServerScope().id, slotId),
  );

  return data;
}

export interface SlotChoosers {
  onShownChange: (pluginId: string, shown: boolean) => void;
  onOwnerChange: (owner: string | null) => void;
}

export function useSlotChoosers(slotId: string): SlotChoosers {
  const client = useQueryClient();
  const server = { serverId: useServerScope().id, slotId };

  return {
    onShownChange: (pluginId, shown) =>
      void chooseSlotPluginShown(client, server, { pluginId, shown }),
    onOwnerChange: (owner) => void chooseSlotOwner(client, server, owner),
  };
}
