import { ModalBottomSheet, RNHostView } from '@expo/ui/jetpack-compose';
import {
  fillMaxHeight,
  fillMaxWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { Host } from '../../native/host';
import { useSheetColors } from './bottom-sheet-colors.android';
import { BottomSheetContent } from './bottom-sheet-content';
import {
  useSheetDismissal,
  type SheetRef,
} from './bottom-sheet-dismissal.android';
import { BottomSheetRoot } from './bottom-sheet-root';
import { BottomSheetTrigger } from './bottom-sheet-trigger';
import { SheetWidth } from './bottom-sheet-width';
import type { BottomSheetProps } from './bottom-sheet.types';

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  const { mounted, sheetRef } = useSheetDismissal(props.open, props.onClosed);
  return (
    <BottomSheetRoot {...props}>
      {props.trigger && <BottomSheetTrigger trigger={props.trigger} />}
      {mounted && <SheetPresentation {...props} sheetRef={sheetRef} />}
    </BottomSheetRoot>
  );
}

function SheetPresentation(presentation: SheetProps): React.JSX.Element {
  const { sheetRef, ...props } = presentation;
  const sheet = useSheetColors(props.surface);
  const dismissible = props.dismissible !== false;
  return (
    <SheetHost>
      <ModalBottomSheet
        {...sheet}
        ref={sheetRef}
        initialFullyExpanded={props.initialSize === 'expanded'}
        onDismissRequest={() => dismissOrCollapse(props, sheetRef)}
        sheetGesturesEnabled={dismissible || props.expandable === true}
        properties={{
          shouldDismissOnBackPress: dismissible,
          shouldDismissOnClickOutside: dismissible,
        }}
      >
        <HostedSheetContent {...props} />
      </ModalBottomSheet>
    </SheetHost>
  );
}

type SheetProps = Pick<
  BottomSheetProps,
  | 'onOpenChange'
  | 'label'
  | 'children'
  | 'dismissible'
  | 'expandable'
  | 'footer'
  | 'initialSize'
  | 'fit'
  | 'contentScrolls'
  | 'surface'
> & { sheetRef: SheetRef };
function HostedSheetContent(
  props: Pick<
    BottomSheetProps,
    | 'onOpenChange'
    | 'label'
    | 'children'
    | 'dismissible'
    | 'expandable'
    | 'footer'
    | 'initialSize'
    | 'fit'
    | 'contentScrolls'
    | 'surface'
  >,
): React.JSX.Element {
  return (
    <RNHostView
      matchContents={props.fit}
      modifiers={props.fit ? [fillMaxWidth()] : [fillMaxHeight()]}
    >
      <SheetWidth fit={props.fit}>
        <BottomSheetContent
          fit={props.fit}
          label={props.label}
          onOpenChange={props.onOpenChange}
          dismissible={props.dismissible}
          footer={props.footer}
          contentScrolls={props.contentScrolls}
          surface={props.surface}
        >
          {props.children}
        </BottomSheetContent>
      </SheetWidth>
    </RNHostView>
  );
}

function SheetHost({
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

function dismissOrCollapse(
  props: Pick<BottomSheetProps, 'onOpenChange' | 'dismissible'>,
  sheetRef: SheetRef,
): void {
  if (props.dismissible === false) {
    void sheetRef.current?.partialExpand();
    return;
  }
  props.onOpenChange(false);
}
