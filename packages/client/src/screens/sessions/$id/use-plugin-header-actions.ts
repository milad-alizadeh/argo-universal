import { sessionHeaderSlotId } from '@repo/contracts/plugins/declared-slots';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import {
  type DeclaredHeaderAction,
  placeSessionHeaderActions,
  type SessionPluginAction,
  type SessionPluginActions,
} from '#features/sessions';
import { useSlotVisibility } from '#features/settings';
import { usePluginOpener } from '../../plugins/use-plugin-opener';

type PageOpener = ReturnType<typeof usePluginOpener>;

const noActions: DeclaredHeaderAction[] = [];

// The enabled Plugins' Session header actions in Slot order, read from their manifests so none starts to answer (ADR-0025).
export function useDeclaredHeaderActions(): DeclaredHeaderAction[] {
  const trpc = useTRPC();

  const { data = noActions } = useQuery(
    trpc.plugins.declared.queryOptions({ slotId: sessionHeaderSlotId }),
  );

  return data;
}

// The Session the header belongs to, and how it opens a Plugin's page for that Session.
interface HeaderOpener {
  open: PageOpener;
  sessionId: string;
}

/*
 * What pressing an action does: open its target page for this Session, which starts the Plugin when it is not
 * running. A page is the only target today; the target is a tagged union so #1130 can add a Workbench card beside it.
 */
const pressOf =
  (
    { open, sessionId }: HeaderOpener,
    { pluginId, item: { target } }: DeclaredHeaderAction,
  ) =>
  (): void =>
    open(pluginId, sessionId)(target.path);

const withPress =
  (opener: HeaderOpener) =>
  (declared: DeclaredHeaderAction): SessionPluginAction => ({
    ...declared,
    onPress: pressOf(opener, declared),
  });

// Where the header sits: its Session, and whether the window is compact, which keeps every Plugin action in "…".
export interface HeaderPlacement {
  sessionId: string;
  compact: boolean;
}

// The Session header's Plugin actions, placed for the window's size class and this Device's switches.
export function usePluginHeaderActions({
  sessionId,
  compact,
}: HeaderPlacement): SessionPluginActions {
  const opener = { open: usePluginOpener(), sessionId };
  const { shows } = useSlotVisibility(sessionHeaderSlotId);

  return placeSessionHeaderActions(
    useDeclaredHeaderActions().map(withPress(opener)),
    { phone: compact, shows },
  );
}
