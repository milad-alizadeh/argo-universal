import type { SessionBarItem } from '@repo/contracts/plugins/session-bar-item';
import {
  sessionBarSlotId,
  type SlotContextOf,
  type SlotInputOf,
} from '@repo/contracts/plugins/wire';
import type { SessionBarProps } from '#features/sessions';
import { type SlotVisibility, useSlotVisibility } from '#features/settings';
import { sessionBarLines } from '../utils/session-bar-lines';
import { itemsSlotEntry, type SlotReading } from '../utils/slot-items';
import { usePluginOpener } from './use-plugin-opener';
import { useSlotReading } from './use-slot-reading';
import { useFireOperation } from './use-tree-calls';

export type SessionContext = SlotContextOf<typeof sessionBarSlotId>;

const sessionBarSlot = itemsSlotEntry(sessionBarSlotId);

const inputOf = (
  session: SessionContext | undefined,
): SlotInputOf<typeof sessionBarSlotId> | undefined =>
  session && { slotId: sessionBarSlotId, contexts: [session] };

/*
 * One Session's bar as the reader reads it: the Session page passes this Device's choices, and the Slot's Settings
 * page the choices on the page.
 */
export function useSessionBarReading(
  session: SessionContext | undefined,
  visibility: SlotVisibility,
): SlotReading<SessionBarItem> {
  return useSlotReading(sessionBarSlot, {
    input: inputOf(session),
    key: session?.sessionId,
    visibility,
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
  const onDetach = useDetachLine(session);

  return lines && { ...lines, onOpen, onDetach };
}

// Runs a line's `detach` for the Session the bar is drawn for, and says why when it fails; a bar with no Session has none.
function useDetachLine(
  session: SessionContext | undefined,
): SessionBarProps['onDetach'] {
  const fire = useFireOperation();

  if (!session) return undefined;

  return ({ pluginId, detach }) => {
    if (!detach) return;

    fire({ pluginId, ...detach, ...session });
  };
}

// Opens a line's Plugin page; a line without one has no Open.
function useOpenLine(): SessionBarProps['onOpen'] {
  const open = usePluginOpener();

  return ({ pluginId, path }) => {
    if (path) open(pluginId)(path);
  };
}
