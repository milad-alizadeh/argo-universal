import type { SessionBarItem } from '@repo/contracts/plugins/session-bar-item';
import {
  type SlotItemsInput,
  sessionBarSlotId,
} from '@repo/contracts/plugins/wire';
import type { SessionBarProps } from '#features/sessions';
import { type SlotVisibility, useSlotVisibility } from '#features/settings';
import { sessionBarLines } from './session-bar-lines';
import {
  itemsSlotEntry,
  readSlotItems,
  type SentItems,
  type SlotReading,
} from './slot-items';
import { usePluginLookup } from './use-plugin-names';
import { usePluginOpener } from './use-plugin-opener';
import { useSlotItems } from './use-slot-items';

export type SessionContext = SlotItemsInput['contexts'][number];

const barSlot = itemsSlotEntry(sessionBarSlotId);

const inputOf = (
  session: SessionContext | undefined,
): SlotItemsInput | undefined =>
  session && { slotId: sessionBarSlotId, contexts: [session] };

// What the Plugins answer for one Session's bar, as the Server sent it; none until the Session has loaded.
function useSessionBarItems(session: SessionContext | undefined): SentItems {
  const { items } = useSlotItems(inputOf(session));

  return session && items[session.sessionId];
}

/*
 * One Session's bar as the reader reads it: the Session page passes this Device's choices, and the Slot's Settings
 * page the choices on the page.
 */
export function useSessionBarReading(
  session: SessionContext | undefined,
  visibility: SlotVisibility,
): SlotReading<SessionBarItem> {
  return readSlotItems(barSlot, useSessionBarItems(session), {
    visibility,
    lookup: usePluginLookup(),
  });
}

// The Session page's bar under this Device's choices; its lines open their Plugin's page.
export function useSessionBar(
  session: SessionContext | undefined,
): SessionBarProps | undefined {
  const lines = sessionBarLines(
    useSessionBarReading(session, useSlotVisibility(sessionBarSlotId)),
  );

  const onOpen = useOpenLine();

  return lines && { ...lines, onOpen };
}

// Opens a line's Plugin page; a line without one has no Open.
function useOpenLine(): SessionBarProps['onOpen'] {
  const open = usePluginOpener();

  return ({ pluginId, path }) => {
    if (path) open(pluginId)(path);
  };
}
