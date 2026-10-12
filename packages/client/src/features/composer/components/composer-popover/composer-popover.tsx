import type * as React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { cloneElement, useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { Text } from '#primitives/display/text/text';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from '#primitives/overlays/popover/popover';
import { BottomSheet } from '../../../../lib/generic/primitives/overlays/bottom-sheet/bottom-sheet';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';

function PopoverPanel({
  children,
  disabled,
  close,
}: {
  children: (close: (after?: () => void) => void) => ReactNode;
  disabled?: boolean;
  close: (after?: () => void) => void;
}): ReactNode {
  const dismiss = usePopoverClose();
  useEffect(() => {
    if (disabled) dismiss();
  }, [disabled, dismiss]);
  return children((after) => {
    close(after);
    dismiss();
  });
}

export function ComposerPopover({
  trigger,
  label,
  width = 320,
  className,
  onPresent,
  listContent,
  children,
}: {
  trigger: ReactElement<{ disabled?: boolean | null; onPress?: () => void }>;
  label: string;
  width?: number;
  listContent?: boolean;
  className?: string;
  // Replaces the overlay, for a menu the app presents itself.
  onPresent?: () => void;
  // `after` runs once the overlay has left the screen, so it may present a system picker.
  children: (close: (after?: () => void) => void) => ReactNode;
}): React.JSX.Element {
  const wide = useWide();
  const layout = useResolveClassNames(className ?? '');
  const [open, setOpen] = useState(false);
  const { close, closed, onOpenChange } = useAfterClose(setOpen);
  if (trigger.props.disabled && open) setOpen(false);
  if (onPresent)
    return (
      <View style={layout}>
        {cloneElement(trigger, { onPress: onPresent })}
      </View>
    );
  if (!wide)
    return (
      <BottomSheet
        style={layout}
        open={open}
        onOpenChange={onOpenChange}
        onClosed={closed}
        trigger={trigger}
        label={label}
        surface="sidebar"
        contentScrolls={listContent}
      >
        <View
          className={
            listContent && Platform.OS !== 'web'
              ? 'flex-1 bg-sidebar'
              : 'bg-sidebar'
          }
        >
          <Text role="control" className="py-3 px-4 text-center">
            {label === 'Agent and model' ? 'Configure' : label}
          </Text>
          {children(close)}
        </View>
      </BottomSheet>
    );
  return (
    <Popover openOnHover style={layout} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild disabled={trigger.props.disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        accessibilityLabel={label}
        onClosed={closed}
        style={{ width }}
        className="composer-popover bg-sidebar rounded-surface border-0 dark:border dark:border-border p-0 overflow-hidden"
      >
        <PopoverPanel disabled={!!trigger.props.disabled} close={close}>
          {children}
        </PopoverPanel>
      </PopoverContent>
    </Popover>
  );
}

function useAfterClose(setOpen: (open: boolean) => void): {
  close: (after?: () => void) => void;
  closed: () => void;
  onOpenChange: (open: boolean) => void;
} {
  const afterClose = useRef<(() => void) | undefined>(undefined);
  return {
    onOpenChange: useCallback(
      (open: boolean): void => {
        if (open) afterClose.current = undefined;
        setOpen(open);
      },
      [setOpen],
    ),
    close: useCallback(
      (after?: () => void): void => {
        afterClose.current = after;
        setOpen(false);
      },
      [setOpen],
    ),
    closed: useCallback((): void => {
      const after = afterClose.current;
      afterClose.current = undefined;
      after?.();
    }, []),
  };
}
