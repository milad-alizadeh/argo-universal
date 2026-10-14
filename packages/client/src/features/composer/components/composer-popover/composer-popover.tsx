import type * as React from 'react';
import type { ReactNode } from 'react';
import { cloneElement, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { Text } from '#primitives/display/text/text';
import { BottomSheet } from '#primitives/overlays/bottom-sheet/bottom-sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from '#primitives/overlays/popover/popover-view';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { useAfterClose } from '../../hooks/use-after-close';
import type { ComposerPopoverProps } from './popover-types';

type PanelProps = Pick<ComposerPopoverProps, 'children'> & {
  disabled?: boolean;
  close: ReturnType<typeof useAfterClose>['close'];
};

function PopoverPanel({ children, disabled, close }: PanelProps): ReactNode {
  const dismiss = usePopoverClose();
  useEffect(() => {
    if (disabled) dismiss();
  }, [disabled, dismiss]);

  return children((after) => {
    close(after);
    dismiss();
  });
}

type OverlayProps = ComposerPopoverProps &
  ReturnType<typeof useAfterClose> & {
    open: boolean;
    layout: ReturnType<typeof useResolveClassNames>;
  };

export function ComposerPopover(
  props: ComposerPopoverProps,
): React.JSX.Element {
  const wide = useWide();
  const layout = useResolveClassNames(popoverClassName(props));
  const [open, setOpen] = useState(false);
  const after = useAfterClose(setOpen);
  closeDisabled(props, open, setOpen);

  if (props.onPresent) return <PresentedPopover {...props} layout={layout} />;
  const Overlay = wide ? WidePopover : CompactPopover;

  return <Overlay {...props} {...after} open={open} layout={layout} />;
}

function WidePopover(props: OverlayProps): React.JSX.Element {
  return (
    <Popover openOnHover style={props.layout} onOpenChange={props.onOpenChange}>
      <PopoverTrigger asChild disabled={props.trigger.props.disabled}>
        {props.trigger}
      </PopoverTrigger>
      <WideContent {...props} />
    </Popover>
  );
}

function WideContent(props: OverlayProps): React.JSX.Element {
  return (
    <PopoverContent
      side="top"
      align="start"
      accessibilityLabel={props.label}
      onClosed={props.closed}
      style={{ width: popoverWidth(props) }}
      className="composer-popover bg-sidebar rounded-surface border-0 dark:border dark:border-border p-0 overflow-hidden"
    >
      <PopoverPanel {...panelProps(props)} />
    </PopoverContent>
  );
}

function CompactPopover(props: OverlayProps): React.JSX.Element {
  return (
    <BottomSheet
      {...sheetProps(props)}
      surface="sidebar"
      contentScrolls={props.listContent}
    >
      <CompactContent {...props} />
    </BottomSheet>
  );
}

function CompactContent(props: OverlayProps): React.JSX.Element {
  const className = compactClassName(props);

  return (
    <View className={className}>
      <Text role="control" className="py-3 px-4 text-center">
        {props.label === 'Agent and model' ? 'Configure' : props.label}
      </Text>
      {props.children(props.close)}
    </View>
  );
}

function popoverClassName(props: ComposerPopoverProps): string {
  return props.className ?? '';
}

function popoverWidth(props: ComposerPopoverProps): number {
  const defaultWidth = 320;

  return props.width ?? defaultWidth;
}

function closeDisabled(
  props: ComposerPopoverProps,
  open: boolean,
  setOpen: (open: boolean) => void,
): void {
  if (props.trigger.props.disabled && open) setOpen(false);
}

function PresentedPopover(
  props: ComposerPopoverProps & Pick<OverlayProps, 'layout'>,
): React.JSX.Element {
  return (
    <View style={props.layout}>
      {cloneElement(props.trigger, { onPress: props.onPresent })}
    </View>
  );
}

function panelProps(props: OverlayProps): PanelProps {
  return {
    disabled: !!props.trigger.props.disabled,
    close: props.close,
    children: props.children,
  };
}

function sheetProps(
  props: OverlayProps,
): Pick<
  React.ComponentProps<typeof BottomSheet>,
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

function compactClassName(props: ComposerPopoverProps): string {
  return props.listContent && Platform.OS !== 'web'
    ? 'flex-1 bg-sidebar'
    : 'bg-sidebar';
}
