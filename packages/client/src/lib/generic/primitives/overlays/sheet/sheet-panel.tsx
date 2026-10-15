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

// The web sheet's content, in a drawer or a popover: its pages, then the footer under them.
export function SheetPanel(props: PresentationProps): ReactElement {
  return (
    <View className="min-h-0 shrink">
      <SheetPageStack stack={props.stack} label={props.label}>
        {props.children}
      </SheetPageStack>
      {props.footer}
    </View>
  );
}
