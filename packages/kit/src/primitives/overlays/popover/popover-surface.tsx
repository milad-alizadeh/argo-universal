import type * as React from 'react';
import { View } from 'react-native';
import { OutsideColumn } from '#kit/content-column/content-column';
import { ListPlaceContext, popoverPlace, useListPlace } from '#kit/list-place';
import { menuSurfaceClassName } from '#kit/menu-surface';
import { cn } from '#kit/utils';
import { TextClassContext } from '#primitives/content/text';
import { InsideHostContext } from '#primitives/native/host';
import { OverlayContent } from '#primitives/overlays/open-state';
import type { PopoverContentProps as ContentProps } from './popover-props';

const contentClassName = cn(
  menuSurfaceClassName,
  'outline-hidden z-50 w-72 p-4 popover-content cursor-auto web:max-h-(--radix-popover-content-available-height) web:overflow-y-auto',
);

const listContentClassName = 'w-80 overflow-hidden p-0';

const surfaceClassName = (props: ContentProps): string =>
  cn(contentClassName, props.list && listContentClassName, props.className);

// Lists inside draw menu rows (the popover place); a phone's popover is a Sheet and keeps its grouped rows.
export function PopoverSurface(
  props: ContentProps & { open: boolean },
): React.JSX.Element {
  return (
    <View
      style={props.style}
      className={surfaceClassName(props)}
      data-state={props.open ? 'open' : 'closed'}
    >
      <TextClassContext.Provider value="text-foreground">
        <PopoverRows>{props.children}</PopoverRows>
      </TextClassContext.Provider>
    </View>
  );
}

/*
 * A popover opened from a Screen's column is a surface of its own, so its lists take none of the column's padding, nor
 * claim it from the Screen. It sits in a portal, outside any FieldGroup's tree it was opened from, so its Hosts draw
 * their own. A popover or menu opened from these rows belongs with this one, and leaves it open.
 */
function PopoverRows(props: { children: React.ReactNode }): React.JSX.Element {
  const place = popoverPlace(useListPlace());

  return (
    <OverlayContent>
      <InsideHostContext.Provider value={false}>
        <OutsideColumn>
          <ListPlaceContext value={place}>{props.children}</ListPlaceContext>
        </OutsideColumn>
      </InsideHostContext.Provider>
    </OverlayContent>
  );
}
