import type { ReactNode } from 'react';
import type { SelectionMode } from '#kit/selection-mode';
import type { ActionGroup, DeclaredAction } from './action-declarations';
import {
  headerSlots,
  isIconAction,
  splitHeaderActions,
  type HeaderActionSplit,
  type IconAction,
} from './header-actions';

/*
 * Where a Screen's header is drawn: Argo's own heading (a wide window, the web, a list column, the band), the iOS
 * stack's toolbar, or Android's top app bar and its FAB.
 */
export type HeaderRoom = 'heading' | 'ios' | 'android';

// What a Screen declares for its header, read once from its props and from the List below it that may select.
export interface HeaderDeclaration {
  groups: ActionGroup[];
  primary: DeclaredAction[];
  search: boolean;
  selection: SelectionMode | null;
  // The nodes the Actions' shortcuts run under, drawn by the Screen.
  anchors: string[];
}

// The header one room draws, finished: where it is drawn only lays it out.
export interface ScreenHeader extends HeaderActionSplit {
  // A selecting List's header, drawn in place of all the rest (ADR-0043); null while no List selects.
  selecting: ReactNode;
  label: string;
  // The one primary Action, a button that needs an icon.
  primary?: IconAction;
  // Starts a List selecting, for the Select entry; null where there is none.
  select: (() => void) | null;
  // Nothing to draw, so the band keeps its own control box.
  empty: boolean;
}

interface Room {
  // The controls the room has for the Screen's Actions, the overflow button included.
  slots: (declared: HeaderDeclaration, primary: boolean) => number;
  disabledPrimary: boolean;
  select: boolean;
}

const rooms: Record<HeaderRoom, Room> = {
  heading: { slots: () => headerSlots, disabledPrimary: true, select: true },
  // The primary Action takes one of the bar's two places; Select is a text item of its own beside them.
  ios: {
    slots: (_, primary) => (primary ? 1 : 2),
    disabledPrimary: true,
    select: true,
  },
  // The primary Action is the FAB, which Material never shows disabled; the search icon takes one of the bar's two places.
  android: {
    slots: ({ search }) => (search ? 1 : 2),
    disabledPrimary: false,
    select: false,
  },
};

const overflowLabel = 'More actions';

const replaced = {
  direct: [],
  overflow: [],
  label: overflowLabel,
  select: null,
  empty: true,
};

// The one rule for every platform's Screen header: what it holds, given where it is drawn.
export function screenHeader(
  declared: HeaderDeclaration,
  room: HeaderRoom,
): ScreenHeader {
  const selecting = declared.selection?.header;

  if (selecting) return { ...replaced, selecting };

  return declaredHeader(declared, rooms[room]);
}

function declaredHeader(declared: HeaderDeclaration, room: Room): ScreenHeader {
  const primary = primaryAction(declared, room);
  const slots = room.slots(declared, primary !== undefined);

  const header = {
    ...splitHeaderActions(declared.groups, slots),
    selecting: null,
    label: overflowLabel,
    primary,
    select: room.select ? selectEntry(declared) : null,
  };

  return { ...header, empty: isEmpty(header) };
}

function primaryAction(
  declared: HeaderDeclaration,
  room: Room,
): IconAction | undefined {
  const action = declared.primary.find(isIconAction);

  return action && shows(room, action) ? action : undefined;
}

const shows = (room: Room, action: IconAction): boolean =>
  room.disabledPrimary || !action.disabled;

const selectEntry = ({ selection }: HeaderDeclaration): (() => void) | null =>
  selection?.begin ?? null;

const isEmpty = (header: Omit<ScreenHeader, 'empty'>): boolean =>
  ![header.primary, header.select, ...header.direct, ...header.overflow].some(
    Boolean,
  );
