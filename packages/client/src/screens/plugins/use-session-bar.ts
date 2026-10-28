import {
  mergedItems,
  SessionBarItem,
  type SlotItemsInput,
  sessionBarSlotId,
} from '@repo/contracts/plugins/wire';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import type { SessionBarProps } from '#features/sessions';
import { type Merged, useSlotVisibility } from '#features/settings';
import { sessionBarLines } from './session-bar-lines';
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

// Each Plugin's name for "+N", or its id until the Server has listed it.
export function usePluginName(): (pluginId: string) => string {
  const { data } = useQuery(useTRPC().plugins.list.queryOptions());

  const names = new Map(
    data?.plugins.map(({ manifest }) => [manifest.id, manifest.name]),
  );

  return (pluginId) => names.get(pluginId) ?? pluginId;
}

// What the Plugins answer for one Session's bar, live, in Slot order; none until the Session has loaded.
export function useSessionBarAnswer(
  session: SessionContext | undefined,
): Merged<SessionBarItem> {
  const answers = useSlotItems(inputOf(session));

  return BarAnswer.parse(session && answers[session.sessionId]);
}

// The Session page's bar under this Device's choices; its lines open their Plugin's page.
export function useSessionBar(
  session: SessionContext | undefined,
): SessionBarProps | undefined {
  const lines = sessionBarLines(
    useSessionBarAnswer(session),
    useSlotVisibility(sessionBarSlotId),
    usePluginName(),
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
