import { useRootContext } from '@rn-primitives/popover';
import type * as React from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import type { ButtonProps } from '#primitives/button';
import { useWide } from '../navigation/use-wide';
import { BottomSheet } from '../primitives/bottom-sheet';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import {
  currentSheetContent,
  publishSheetContent,
  useNativeSheets,
} from './agent-model-sheet-context';

function PopoverPanel({
  children,
  disabled,
  close,
}: {
  children: (close: (after?: () => void) => void) => ReactNode;
  disabled?: boolean;
  close: (after?: () => void) => void;
}): ReactNode {
  const { onOpenChange } = useRootContext();
  useEffect(() => {
    if (disabled) onOpenChange(false);
  }, [disabled, onOpenChange]);
  return children((after) => {
    close(after);
    onOpenChange(false);
  });
}

export function ComposerPopover({
  trigger,
  label,
  width = 280,
  className,
  onPresent,
  children,
}: {
  trigger: ReactElement<ButtonProps>;
  label: string;
  width?: number;
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
  const sheets = useNativeSheets();
  const owner = useId();
  const nativeSheet = !wide && sheets;
  // Keeps the sheet drawing this menu's latest state while it shows it.
  useEffect(() => {
    if (nativeSheet && currentSheetContent()?.owner === owner)
      publishSheetContent({ owner, label, render: children });
  });
  if (onPresent)
    return (
      <View style={layout}>
        {cloneElement(trigger, { onPress: onPresent })}
      </View>
    );
  if (nativeSheet)
    return (
      <View style={layout}>
        {cloneElement(trigger, {
          onPress: () => {
            publishSheetContent({ owner, label, render: children });
            sheets.content();
          },
        })}
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
      >
        {children(close)}
      </BottomSheet>
    );
  return (
    <Popover style={layout} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild disabled={trigger.props.disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        accessibilityLabel={label}
        onClosed={closed}
        style={{ width }}
        className="composer-popover p-0 rounded-lg overflow-hidden"
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
