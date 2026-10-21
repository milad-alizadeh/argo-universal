import type { ReactElement } from 'react';
import { View } from 'react-native';
import { SheetPageStack } from './sheet-page-stack';
import type { SheetStack } from './sheet-pages';
import type { SheetProps } from './sheet-props';

export type PresentationProps = SheetProps & { stack: SheetStack };

// Opening asks the owner; closing reports a dismissal once, however it was closed.
export function openChange(props: PresentationProps): (open: boolean) => void {
  return (open) => {
    if (open) props.onOpenChange(true);
    else props.stack.reports.dismissed();
  };
}

// A sheet with pages keeps a steady height as they change; one that rests only at its full height fills the window.
export function sheetHeightClass(props: PresentationProps): string | false {
  if (fullHeight(props.detents)) return 'sheet-full';

  return props.stack.pages.length > 0 && 'sheet-paged';
}

const fullHeight = (detents: SheetProps['detents']): boolean =>
  detents?.join() === 'large';

// The web sheet's content, in a drawer or a popover: its pages, then the footer under them.
export function SheetPanel(
  props: PresentationProps & { hideRootTitle?: boolean },
): ReactElement {
  return (
    <View className="min-h-0 shrink">
      <SheetPageStack {...props}>{props.children}</SheetPageStack>
      {props.footer}
    </View>
  );
}
