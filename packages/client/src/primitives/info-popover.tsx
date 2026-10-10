import type * as React from 'react';
import { Icon } from '../lib/icon';
import { Button } from './button';
import type { InfoPopoverProps } from './info-popover-props';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Text } from './text';

// An "i" that explains a control in a small popover. iOS and Android draw the system popover (info-popover.ios.tsx, info-popover.android.tsx).
export function InfoPopover({
  accessibilityLabel,
  text,
}: InfoPopoverProps): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel={accessibilityLabel}
          className="size-7 sm:size-7"
        >
          <Icon name="info" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-3">
        <Text selectable={false} className="select-none type-secondary">
          {text}
        </Text>
      </PopoverContent>
    </Popover>
  );
}
