import { useContext, type ReactNode } from 'react';
import { View } from 'react-native';
import { Host, InsideHostContext } from '#primitives/native/host';
import type { SheetProps } from './sheet-props';
import { SheetTrigger } from './sheet-trigger';

type FrameProps = SheetProps & { popover: boolean; children: ReactNode };

/*
 * The sheet's place in React Native layout, with its trigger beside the Host that holds the native sheet. Opened
 * from inside a FieldGroup's native tree (a Picker's `page`) there is no layout to sit in, so the sheet is drawn
 * straight into that tree.
 */
export function SheetFrame(props: FrameProps): ReactNode {
  const inside = useContext(InsideHostContext);

  if (inside) return props.children;

  return (
    <View style={props.style} className="min-w-0 shrink">
      {!props.popover && <SheetTrigger {...props} />}
      <Host matchContents>{props.children}</Host>
    </View>
  );
}
