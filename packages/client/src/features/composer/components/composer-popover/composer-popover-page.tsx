import type * as React from 'react';
import { Platform, View } from 'react-native';
import type { useResolveClassNames } from 'uniwind';
import { Sheet } from '#primitives/overlays/sheet';
import type { useAfterClose } from '../../hooks/use-after-close';
import type { ComposerPopoverProps } from './popover-types';

export type OverlayProps = ComposerPopoverProps &
  ReturnType<typeof useAfterClose> & {
    open: boolean;
    layout: ReturnType<typeof useResolveClassNames>;
  };

// A call, not a component: Sheet reads the page declaration from its direct children.
export function rootPage(props: OverlayProps): React.JSX.Element {
  return (
    <Sheet.Page name="root" title={props.label}>
      <View className={compactClassName(props)}>
        {props.children(props.close)}
      </View>
    </Sheet.Page>
  );
}

// A native sheet's first page takes the kit's page header: its title, and no Back.
export function nativePage(props: ComposerPopoverProps): boolean {
  return !!props.pageHeader && Platform.OS !== 'web';
}

export function sheetProps(
  props: OverlayProps,
): Pick<
  React.ComponentProps<typeof Sheet>,
  'style' | 'open' | 'onOpenChange' | 'onClosed' | 'trigger' | 'label'
> {
  return {
    style: props.layout,
    open: props.open,
    onOpenChange: props.onOpenChange,
    onClosed: props.closed,
    trigger: props.trigger,
    label: props.label,
  };
}

export function compactClassName(
  props: ComposerPopoverProps,
): string | undefined {
  return props.listContent && Platform.OS !== 'web' ? 'flex-1' : undefined;
}
