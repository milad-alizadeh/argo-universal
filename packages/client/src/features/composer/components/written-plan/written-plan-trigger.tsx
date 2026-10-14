import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import { contentActionClass } from '#primitives/buttons/button';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { Pressable } from '#primitives/pressable';

export interface WrittenPlanTriggerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  wide: boolean;
}

export function WrittenPlanTrigger(
  props: WrittenPlanTriggerProps,
): React.JSX.Element {
  return (
    <Pressable {...triggerProps(props)}>
      <Icon role="control" name="file-text" className="text-muted-foreground" />
      <Text role="secondary" className={cn(!props.wide && 'text-foreground')}>
        Written plan
      </Text>
      {props.wide && <WideTitle title={props.title} />}
    </Pressable>
  );
}

function triggerProps(
  props: WrittenPlanTriggerProps,
): React.ComponentProps<typeof Pressable> {
  return {
    accessibilityLabel: 'Written plan',
    'aria-expanded': props.open,
    onPress: () => props.setOpen(!props.open),
    role: 'button',
    className: writtenPlanTriggerClass(props.wide),
  };
}

function writtenPlanTriggerClass(wide: boolean): string {
  return contentActionClass({
    variant: 'ghost',
    className: cn(
      'min-h-6 sm:min-h-6 py-0 px-2.5 gap-1.5 rounded-full border border-border bg-card shadow-composer',
      wide &&
        'h-8 sm:h-8 w-full justify-start pl-2 pr-1.5 rounded-none border-0 bg-transparent shadow-none',
    ),
  });
}

const wideTitleTextProps = {
  numberOfLines: 1,
  role: 'secondary',
  className: 'min-w-0 flex-1 text-foreground',
} as const;

function WideTitle({
  title,
}: Pick<WrittenPlanTriggerProps, 'title'>): React.JSX.Element {
  return (
    <>
      <Text {...wideTitleTextProps}>{title}</Text>
      <Icon
        role="secondary"
        name="chevron-up"
        className="text-muted-foreground"
      />
    </>
  );
}
