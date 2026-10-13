import { RNHostView } from '@expo/ui/jetpack-compose';
import { fillMaxHeight } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { Host } from '../../native/host';
import { BottomSheetContent } from './bottom-sheet-content';
import type { BottomSheetProps } from './bottom-sheet.types';

export type HostedSheetProps = Pick<
  BottomSheetProps,
  | 'onOpenChange'
  | 'label'
  | 'children'
  | 'dismissible'
  | 'contentScrolls'
  | 'surface'
>;

export function HostedSheetContent(props: HostedSheetProps): React.JSX.Element {
  return (
    <RNHostView modifiers={[fillMaxHeight()]}>
      <BottomSheetContent
        label={props.label}
        onOpenChange={props.onOpenChange}
        dismissible={props.dismissible}
        contentScrolls={props.contentScrolls}
        surface={props.surface}
      >
        {props.children}
      </BottomSheetContent>
    </RNHostView>
  );
}

export function SheetHost({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Host style={{ position: 'absolute' }} pointerEvents="none">
      {children}
    </Host>
  );
}
