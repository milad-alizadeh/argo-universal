import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { SheetProps } from './sheet-props';
import { ReactContent } from './sheet-react-content';
import { SheetScreenStack } from './sheet-screen-stack';
import type { SheetStack } from './sheet-screens';

export type PresentationProps = SheetProps & { stack: SheetStack };

// Opening asks the owner; closing reports a dismissal once, however it was closed.
export function openChange(props: PresentationProps): (open: boolean) => void {
  return (open) => {
    if (open) props.onOpenChange(true);
    else props.stack.reports.dismissed();
  };
}

// A sheet with several pages keeps a steady height as they change, as does one whose content scrolls itself at detents, which has no height of its own to take; one that rests only at its full height fills the window.
export function sheetHeightClass(props: PresentationProps): string | false {
  if (fullHeight(props.detents)) return 'sheet-full';

  return keepsHeight(props) && 'sheet-paged';
}

const keepsHeight = (props: PresentationProps): boolean =>
  props.stack.pages.length > 1 || scrollsAtDetents(props);

const scrollsAtDetents = (props: PresentationProps): boolean =>
  props.contentScrolls === true && props.detents !== undefined;

const fullHeight = (detents: SheetProps['detents']): boolean =>
  detents?.join() === 'large';

// The web sheet's content, in a drawer or a popover: its pages, then the footer under them.
export function SheetPanel(
  props: PresentationProps & { hideRootTitle?: boolean },
): ReactElement {
  return (
    <ReactContent>
      <View className="min-h-0 shrink">
        <SheetScreenStack {...props}>{props.children}</SheetScreenStack>
        {props.footer}
      </View>
    </ReactContent>
  );
}
