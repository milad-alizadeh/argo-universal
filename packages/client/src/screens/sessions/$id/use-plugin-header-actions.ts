import {
  type SessionHeaderTarget,
  sessionHeaderSlot,
} from '@repo/contracts/plugins/declared-slots';
import {
  type DeclaredHeaderAction,
  placeSessionHeaderActions,
  type SessionPluginAction,
  type SessionPluginActions,
} from '#features/sessions';
import { useSlotVisibility } from '#features/settings';
import { usePluginOpener } from '../../plugins/use-plugin-opener';
import { useDeclaredItems } from './use-declared-items';

type PageOpener = ReturnType<typeof usePluginOpener>;

// What a header action targeting a Workbench card does: shows that Plugin's card, or closes it while it is open.
export type ToggleWorkbenchCard = (pluginId: string, cardId: string) => void;

// The enabled Plugins' Session header actions in Slot order, read from their manifests so none starts to answer (ADR-0025).
export function useDeclaredHeaderActions(): DeclaredHeaderAction[] {
  return useDeclaredItems(sessionHeaderSlot);
}

// The Session the header belongs to, how it opens a Plugin's page for that Session, and how it toggles a Plugin's card.
interface HeaderOpener {
  open: PageOpener;
  sessionId: string;
  toggleCard: ToggleWorkbenchCard;
}

/*
 * What pressing an action does: open its target page for this Session, which starts the Plugin when it is not
 * running, or toggle the Workbench card the Plugin declares under that id.
 */
const pressTarget = (
  { open, sessionId, toggleCard }: HeaderOpener,
  pluginId: string,
  target: SessionHeaderTarget,
): void => {
  if (target.type === 'card') toggleCard(pluginId, target.cardId);
  else open(pluginId, { sessionId })(target.path);
};

const withPress =
  (opener: HeaderOpener) =>
  (declared: DeclaredHeaderAction): SessionPluginAction => ({
    ...declared,
    onPress: () => pressTarget(opener, declared.pluginId, declared.item.target),
  });

// Where the header sits: its Session, whether the window is compact, which keeps every Plugin action in "…", and how its cards toggle.
export interface HeaderPlacement {
  sessionId: string;
  compact: boolean;
  toggleCard: ToggleWorkbenchCard;
}

// The Session header's Plugin actions, placed for the window's size class and this Device's switches.
export function usePluginHeaderActions({
  sessionId,
  compact,
  toggleCard,
}: HeaderPlacement): SessionPluginActions {
  const opener = { open: usePluginOpener(), sessionId, toggleCard };
  const { shows } = useSlotVisibility(sessionHeaderSlot.id);

  return placeSessionHeaderActions(
    useDeclaredHeaderActions().map(withPress(opener)),
    { phone: compact, shows },
  );
}
