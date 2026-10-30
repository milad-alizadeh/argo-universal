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
}

/*
 * The Session header's Plugin actions in Slot order, split by the Slot's limit: on a desktop the first header actions
 * that fit sit beside "…", and the rest, every menu action and everything on a phone go inside it.
 */
export function placeSessionHeaderActions<Action extends DeclaredHeaderAction>(
  declared: readonly Action[],
  { phone, shows }: HeaderPlace,
): PlacedHeaderActions<Action> {
  const { limit, shown } = sessionHeaderSlot.content.placement;
  const visible = declared.filter(({ pluginId }) => shows(pluginId));

  const beside = visible
    .filter(({ item }) => shown(item))
    .slice(0, phone ? limit.phone : limit.desktop);

  return {
    beside,
    menu: visible.filter((action) => !beside.includes(action)),
  };
}
