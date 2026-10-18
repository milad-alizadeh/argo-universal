import type * as React from 'react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { Text } from '#primitives/content/text';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from '#primitives/overlays/popover';
import { Sheet } from '#primitives/overlays/sheet';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { useAfterClose } from '../../hooks/use-after-close';
import { useComposerOverlay } from '../../hooks/use-composer-overlay';
import {
  compactClassName,
  type OverlayProps,
  rootPage,
  sheetProps,
} from './composer-popover-page';
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

export function ComposerPopover(
  props: ComposerPopoverProps,
): React.JSX.Element {
  const layout = useResolveClassNames(popoverClassName(props));
  const [open, setOpen] = useComposerOverlay(props.trigger.props.disabled);
  const after = useAfterClose(setOpen);

  // A desktop window opens a popover; a narrow window and a phone or iPad, whose Sheet is native, a sheet.
  const Overlay = Platform.OS === 'web' ? WebOverlay : CompactPopover;

  return <Overlay {...props} {...after} open={open} layout={layout} />;
}

function WebOverlay(props: OverlayProps): React.JSX.Element {
  return (
    <SizeClass
      compact={<CompactPopover {...props} />}
      wide={<WidePopover {...props} />}
    />
  );
}

function WidePopover(props: OverlayProps): React.JSX.Element {
  return (
    <Popover
      open={props.open}
      openOnHover
      style={props.layout}
      onOpenChange={props.onOpenChange}
    >
      <PopoverTrigger disabled={props.trigger.props.disabled}>
        {props.trigger}
      </PopoverTrigger>
      <WideContent {...props} />
    </Popover>
  );
}

function WideContent(props: OverlayProps): React.JSX.Element {
  return (
    <PopoverContent
      align="start"
      accessibilityLabel={props.label}
      onClosed={props.closed}
      style={{ width: popoverWidth(props) }}
      className={wideContentClassName(props)}
    >
      <PopoverPanel {...panelProps(props)} />
    </PopoverContent>
  );
}

function wideContentClassName(props: OverlayProps): string {
  return (
    props.contentClassName ??
    'composer-popover bg-card rounded-2xl border border-border p-0 overflow-hidden'
  );
}

function CompactPopover(props: OverlayProps): React.JSX.Element {
  return (
    <Sheet
      {...sheetProps(props)}
      contentScrolls={props.listContent}
      detents={props.listContent ? ['medium', 'large'] : undefined}
    >
      {Platform.OS === 'web' ? <CompactContent {...props} /> : rootPage(props)}
    </Sheet>
  );
}

// A narrow web window centres the label over the content.
function CompactContent(props: OverlayProps): React.JSX.Element {
  const className = compactClassName(props);

  return (
    <View className={className}>
      <Text role="control" className="py-3 px-4 text-center">
        {props.label}
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

function panelProps(props: OverlayProps): PanelProps {
  return {
    disabled: !!props.trigger.props.disabled,
    close: props.close,
    children: props.children,
  };
}
