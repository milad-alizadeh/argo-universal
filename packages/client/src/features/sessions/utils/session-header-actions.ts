import {
  type SessionHeaderAction,
  sessionHeaderSlot,
} from '@repo/contracts/plugins/declared-slots';

// One Plugin's header action, as the Server lists the Slot.
export interface DeclaredHeaderAction {
  pluginId: string;
  item: SessionHeaderAction;
}

// Where each Plugin action sits: beside Argo's "…", or inside it after Argo's own.
export interface PlacedHeaderActions<Action extends DeclaredHeaderAction> {
  beside: Action[];
  menu: Action[];
}

// A Plugin action ready to draw: pressing it opens the Plugin's page, which starts the Plugin.
export interface SessionPluginAction extends DeclaredHeaderAction {
  onPress: () => void;
}

export type SessionPluginActions = PlacedHeaderActions<SessionPluginAction>;

interface HeaderPlace {
  // A phone's header keeps its places for stock buttons, so every Plugin action goes in "…".
  phone: boolean;
  // This Device's per-Plugin switch on the Slot's Settings page.
  shows: (pluginId: string) => boolean;
  // Whether a Plugin's Workbench card has something to show; an action targeting one that has not is left out.
  filled?: (pluginId: string, cardId: string) => boolean;
}

const alwaysFilled = (): boolean => true;

// An action that targets a card is drawn only while the card has something to show.
const cardShown = (
  filled: NonNullable<HeaderPlace['filled']>,
  pluginId: string,
  { target }: SessionHeaderAction,
): boolean => target.type !== 'card' || filled(pluginId, target.cardId);

/*
 * The Session header's Plugin actions in Slot order, split by the Slot's limit: on a desktop the first header actions
 * that fit sit beside "…", and the rest, every menu action and everything on a phone go inside it.
 */
export function placeSessionHeaderActions<Action extends DeclaredHeaderAction>(
  declared: readonly Action[],
  { phone, shows, filled = alwaysFilled }: HeaderPlace,
): PlacedHeaderActions<Action> {
  const { limit, shown } = sessionHeaderSlot.content.placement;
  const visible = declared.filter(
    ({ pluginId, item }) => shows(pluginId) && cardShown(filled, pluginId, item),
  );

  const beside = visible
    .filter(({ item }) => shown(item))
    .slice(0, phone ? limit.phone : limit.desktop);

  return {
    beside,
    menu: visible.filter((action) => !beside.includes(action)),
  };
}
