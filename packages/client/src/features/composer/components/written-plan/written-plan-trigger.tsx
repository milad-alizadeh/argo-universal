import { contentActionClass } from '@repo/kit/primitives/actions/pressable';
import { Pressable } from '@repo/kit/primitives/actions/pressable';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { Chevron } from '@repo/kit/primitives/status/chevron';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';

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
      <Icon name="file-text" className="text-muted-foreground" />
      <WrittenPlanLabel wide={props.wide} />
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
      'min-h-6 sm:min-h-6 py-0 px-2.5 gap-1.5 rounded-full border border-border bg-card shadow-card',
      wide &&
        'h-8 sm:h-8 w-full justify-start pl-2 pr-1.5 rounded-none border-0 bg-transparent shadow-none',
    ),
  });
}

const wideTitleTextProps = {
  numberOfLines: 1,
  role: 'secondary',
  className: 'min-w-0 flex-1 text-foreground wide-type:text-sm',
} as const;

function WideTitle({
  title,
}: Pick<WrittenPlanTriggerProps, 'title'>): React.JSX.Element {
  return (
    <>
      <Text {...wideTitleTextProps}>{title}</Text>
      <Chevron direction="up" />
    </>
  );
}

function WrittenPlanLabel({
  wide,
}: Pick<WrittenPlanTriggerProps, 'wide'>): React.JSX.Element {
  return (
    <Text
      role="secondary"
      className={cn('wide-type:text-sm', !wide && 'text-foreground')}
    >
      Written plan
    </Text>
  );
}
