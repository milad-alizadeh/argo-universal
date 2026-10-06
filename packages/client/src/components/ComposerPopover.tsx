import { useRootContext } from '@rn-primitives/popover';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useResolveClassNames } from 'uniwind';
import type { ButtonProps } from '#primitives/button';
import { Popover, PopoverContent, PopoverTrigger } from '#primitives/popover';
import { useWide } from '../navigation/use-wide';
import { ComposerSheet } from './ComposerSheet';

function PopoverPanel({
  children,
  disabled,
}: {
  children: (close: () => void) => ReactNode;
  disabled?: boolean;
}) {
  const { onOpenChange } = useRootContext();
  useEffect(() => {
    if (disabled) onOpenChange(false);
  }, [disabled, onOpenChange]);
  return children(() => onOpenChange(false));
}

export function ComposerPopover({
  trigger,
  label,
  width = 280,
  className,
  children,
}: {
  trigger: ReactElement<ButtonProps>;
  label: string;
  width?: number;
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const wide = useWide();
  const layout = useResolveClassNames(className ?? '');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (trigger.props.disabled) setOpen(false);
  }, [trigger.props.disabled]);
  const content = children(() => setOpen(false));
  if (!wide)
    return (
      <ComposerSheet
        style={layout}
        open={open}
        onOpenChange={setOpen}
        trigger={trigger}
        label={label}
      >
        {content}
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
