import type {
  SlotItemsAnswer,
  SlotsApi,
} from '@repo/contracts/plugins/argo-api';
import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import type { ItemsContext, PluginEvent } from '@repo/contracts/plugins/wire';

type ItemsEvent = Extract<PluginEvent, { type: 'slotItems' }>;

type ItemsReply = Extract<SlotCall, { action: 'items' }>['items'];

export type SlotSend = (slotCall: SlotCall) => Promise<void>;

export interface SlotProviders {
  register: SlotsApi['register'];
  answer: (event: ItemsEvent) => void;
  changed: SlotsApi['changed'];
}

type ItemsRequest = Readonly<{ contexts: readonly Readonly<ItemsContext>[] }>;

/*
 * A provider as the registry holds it, written as a method so that providers for Slots with different
 * contexts sit in one map: a provider is only ever called with the contexts of the Slot it answers.
 */
interface Held {
  provide(request: ItemsRequest): SlotItemsAnswer | Promise<SlotItemsAnswer>;
}

// The items Slot providers a Plugin registered; each batched call is answered by its id, or failed with why.
export function slotProviders(send: SlotSend): SlotProviders {
  const providers = new Map<string, Held>();

  return {
    register: (slotId, provider) =>
      void providers.set(slotId, { provide: provider }),
    answer: (event) =>
      void answer(send, providers.get(event.input.slotId), event),
    changed: (slotId) => send({ action: 'changed', slotId }),
  };
}

async function answer(
  send: SlotSend,
  provider: Held | undefined,
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
  provider: Held | undefined,
  { slotId, contexts }: ItemsEvent['input'],
): Promise<ItemsReply> {
  if (!provider) throw new Error(`no provider registered for ${slotId}`);

  const request = Object.freeze({
    contexts: Object.freeze(contexts.map((context) => Object.freeze(context))),
  });

  return JSON.parse(JSON.stringify((await provider.provide(request)) ?? null));
}
