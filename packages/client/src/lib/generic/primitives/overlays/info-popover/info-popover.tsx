import type * as React from 'react';
import { IconButton } from '../../buttons/icon-button/icon-button';
import { Text } from '../../display/text/text';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/popover';
import type { InfoPopoverProps } from './info-popover-props';

export function InfoPopover(props: InfoPopoverProps): React.JSX.Element {
  return (
    <Popover>
      <InfoButton accessibilityLabel={props.accessibilityLabel} />
      <PopoverContent side="top" align="start" className="w-64 p-3">
        <Text selectable={false} role="secondary" className="select-none">
          {props.text}
        </Text>
      </PopoverContent>
    </Popover>
  );
}

function InfoButton({
  accessibilityLabel,
}: Pick<InfoPopoverProps, 'accessibilityLabel'>): React.JSX.Element {
  return (
    <PopoverTrigger asChild>
      <IconButton
        {...infoButtonProps}
        accessibilityLabel={accessibilityLabel}
        icon={'info'}
        iconClassName={'text-muted-foreground'}
        size="sm"
      />
    </PopoverTrigger>
  );
}

const infoButtonProps = {
  variant: 'ghost',
  size: 'sm',
  className: 'size-7 sm:size-7',
} satisfies Pick<
  React.ComponentProps<typeof IconButton>,
  'variant' | 'size' | 'className'
>;
