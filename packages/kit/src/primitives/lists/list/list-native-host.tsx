import { useMemo, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  fieldGroupColumnStyle,
  useClaimColumn,
} from '#kit/content-column/content-column';
import { Host, InsideHostContext } from '#primitives/native/host';
import { ListEmpty } from './list-data';
import { useMovableReading } from './list-movable-reading';
import { MoveAnnouncer } from './list-move-announcer';
import { ListMoveOrderContext } from './list-move-context';
import {
  useMoveOrder,
  type MoveAnswer,
  type MoveOrder,
} from './list-move-order';
import { ListMovePicker } from './list-move-picker-drawing';
import type { NativeGroupedProps } from './list-native-props';
import {
  nativeSections,
  shownNativeSections,
  type NativeSection,
} from './list-native-sections';
import { useWarnRowsWithoutIds } from './list-native-unmoved';

const fill = { flex: 1 };

/*
 * The one Host of a native grouped List; its rows are FieldGroup rows, which draw into it. Its cards keep the
 * platform's own inset, so it claims the Screen's column as grouped cards, and the Screen adds no gutter of its own.
 * It keeps to the column itself, as a FieldGroup does: a View is the column, capped, centred and padded, because
 * Compose's Host ignores padding and honours the cap.
 */
function NativeHost(props: { children: ReactNode }): ReactElement {
  const column = fieldGroupColumnStyle(useClaimColumn('grouped'));

  return (
    <View style={{ ...fill, ...column }}>
      <Host style={fill}>
        <InsideHostContext.Provider value>
          {props.children}
        </InsideHostContext.Provider>
      </Host>
    </View>
  );
}

type NativeGroupedFrameProps = {
  list: NativeGroupedProps;
  // The platform's native list of the sections.
  children: (sections: NativeSection[]) => ReactNode;
};

type DrawnProps = Omit<NativeGroupedFrameProps, 'list'> & {
  sections: NativeSection[];
  empty: ReactNode;
};

// Its empty state when no section has rows, otherwise the platform's list in the Host.
function Drawn(props: DrawnProps): ReactNode {
  if (props.sections.length === 0) return <ListEmpty empty={props.empty} />;

  return <NativeHost>{props.children(props.sections)}</NativeHost>;
}

type MovingProps = NativeGroupedFrameProps & { onMove: MoveAnswer };

// A moving List's order, and its native sections in the order it shows.
interface ShownSections {
  order: MoveOrder;
  sections: NativeSection[];
}

function useShownSections(
  list: NativeGroupedProps,
  onMove: MoveAnswer,
): ShownSections {
  const { order } = useMovableReading({ children: list.children }, onMove);
  const shown = useMoveOrder(order, (each) => each.sections);

  const sections = useMemo(
    () => shownNativeSections(list.children, shown ?? []),
    [list.children, shown],
  );

  useWarnRowsWithoutIds(sections);

  return { order, sections };
}

// The Move to… picker while a row's is open, and a screen reader's notice of where a row landed.
function MoveOverlays({ order }: { order: MoveOrder }): ReactElement {
  const picking = useMoveOrder(order, (each) => each.picking);
  const notice = useMoveOrder(order, (each) => each.notice);

  return (
    <>
      <ListMovePicker id={picking} />
      <MoveAnnouncer notice={notice ?? null} />
    </>
  );
}

/*
 * A native grouped List with `onMove`: its rows draw in the order it shows, and each movable row's Move menu moves it
 * in that order. The Move to… picker and a screen reader's notice of where a row landed draw over the platform's list.
 */
function MovingFrame({ list, onMove, children }: MovingProps): ReactElement {
  const { order, sections } = useShownSections(list, onMove);

  return (
    <ListMoveOrderContext value={order}>
      <View className="relative min-h-0 flex-1">
        <Drawn sections={sections} empty={list.empty}>
          {children}
        </Drawn>
        <MoveOverlays order={order} />
      </View>
    </ListMoveOrderContext>
  );
}

// A native grouped List: its empty state when no section has rows, otherwise the platform's list in the Host.
export function NativeGroupedFrame(props: NativeGroupedFrameProps): ReactNode {
  const { onMove } = props.list;

  if (onMove) return <MovingFrame {...props} onMove={onMove} />;

  return (
    <Drawn
      sections={nativeSections(props.list.children)}
      empty={props.list.empty}
    >
      {props.children}
    </Drawn>
  );
}
