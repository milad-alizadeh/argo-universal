import { SessionBarItem } from '@repo/contracts/plugins/session-bar-item';
import {
  mergedItems,
  type SlotItemsInput,
  sessionBarSlotId,
} from '@repo/contracts/plugins/wire';
import type { SessionBarProps } from '#features/sessions';
import { type SplitItems, useSlotVisibility } from '#features/settings';
import { sessionBarLines } from './session-bar-lines';
import { usePluginNames } from './use-plugin-names';
import { usePluginOpener } from './use-plugin-opener';
import { useSlotItems } from './use-slot-items';

// A Server that sent no answer for the Session, or something else, gives none.
const BarAnswer = mergedItems(SessionBarItem).catch({
  items: [],
  overflow: [],
});

export type SessionContext = SlotItemsInput['contexts'][number];

const inputOf = (
  session: SessionContext | undefined,
): SlotItemsInput | undefined =>
  session && { slotId: sessionBarSlotId, contexts: [session] };

// What the Plugins answer for one Session's bar, live, in Slot order; none until the Session has loaded.
export function useSessionBarAnswer(
  session: SessionContext | undefined,
): SplitItems<SessionBarItem> {
  const { items } = useSlotItems(inputOf(session));

  return BarAnswer.parse(session && items[session.sessionId]);
}

// The Session page's bar under this Device's choices; its lines open their Plugin's page.
export function useSessionBar(
  session: SessionContext | undefined,
): SessionBarProps | undefined {
  const lines = sessionBarLines(
    useSessionBarAnswer(session),
    useSlotVisibility(sessionBarSlotId),
    usePluginNames(),
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
