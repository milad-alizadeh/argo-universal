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
import { Popover, PopoverContent, PopoverTrigger } from '#primitives/popover';
import { useWide } from '../navigation/use-wide';
import {
  currentSheetContent,
  publishSheetContent,
  useNativeSheets,
} from './agent-model-sheet-context';
import { ComposerSheet } from './composer-sheet';

function PopoverPanel({
  children,
  disabled,
}: {
  children: (close: (after?: () => void) => void) => ReactNode;
  disabled?: boolean;
}): ReactNode {
  const { onOpenChange } = useRootContext();
  useEffect(() => {
    if (disabled) onOpenChange(false);
  }, [disabled, onOpenChange]);
  return children((after) => {
    onOpenChange(false);
    after?.();
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
  const { close, closed } = useAfterClose(setOpen);
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
      <ComposerSheet
        style={layout}
        open={open}
        onOpenChange={setOpen}
        onClosed={closed}
        trigger={trigger}
        label={label}
      >
        {children(close)}
      </ComposerSheet>
    );
  return (
    <Popover style={layout}>
      <PopoverTrigger asChild disabled={trigger.props.disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        accessibilityLabel={label}
        style={{ width }}
        className="composer-popover p-0 rounded-lg overflow-hidden"
      >
        <PopoverPanel disabled={!!trigger.props.disabled}>
          {children}
        </PopoverPanel>
      </PopoverContent>
    </Popover>
  );
}

function useAfterClose(setOpen: (open: boolean) => void): {
  close: (after?: () => void) => void;
  closed: () => void;
} {
  const afterClose = useRef<(() => void) | undefined>(undefined);
  return {
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
