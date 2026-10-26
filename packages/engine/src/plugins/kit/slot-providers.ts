import type {
  SlotContent,
  SlotItemsProvider,
} from '@repo/contracts/plugins/argo-api';
import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import { itemsSlot, type PluginEvent } from '@repo/contracts/plugins/wire';
import type { Pages } from './pages';

type ItemsEvent = Extract<PluginEvent, { type: 'slotItems' }>;

type ItemsReply = Extract<SlotCall, { action: 'items' }>['items'];

export type SlotSend = (slotCall: SlotCall) => Promise<void>;

export interface SlotProviders {
  register: (slotId: string, content: SlotContent | SlotItemsProvider) => void;
  answer: (event: ItemsEvent) => void;
  changed: (
    slotId: Extract<SlotCall, { action: 'changed' }>['slotId'],
  ) => Promise<void>;
}

// An items Slot takes a provider, every other Slot a component: the registry entry says which.
function providesItems(
  slotId: string,
  content: SlotContent | SlotItemsProvider,
): content is SlotItemsProvider {
  return typeof content === 'function' && itemsSlot(slotId) !== undefined;
}

// The items Slot providers a Plugin registered; each batched call is answered by its id, or failed with why.
export function slotProviders(send: SlotSend, pages: Pages): SlotProviders {
  const providers = new Map<string, SlotItemsProvider>();

  return {
    register: (slotId, content) => {
      if (providesItems(slotId, content)) providers.set(slotId, content);
      else pages.registerSlot(slotId, content);
    },
    answer: (event) =>
      void answer(send, providers.get(event.input.slotId), event),
    changed: (slotId) => send({ action: 'changed', slotId }),
  };
}

async function answer(
  send: SlotSend,
  provider: SlotItemsProvider | undefined,
  { id, input }: ItemsEvent,
): Promise<void> {
  try {
    await send({ action: 'items', id, items: await itemsOf(provider, input) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    await send({ action: 'failed', id, error: reason }).catch(() => null);
  }
}

// Only JSON leaves the realm, so the Server checks the very items the Plugin answered.
async function itemsOf(
  provider: SlotItemsProvider | undefined,
  { slotId, contexts }: ItemsEvent['input'],
): Promise<ItemsReply> {
  if (!provider) throw new Error(`no provider registered for ${slotId}`);

  const request = Object.freeze({
    contexts: Object.freeze(contexts.map((context) => Object.freeze(context))),
  });

  return JSON.parse(JSON.stringify((await provider(request)) ?? null));
}
