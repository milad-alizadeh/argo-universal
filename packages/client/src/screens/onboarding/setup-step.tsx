import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { type StepMark } from '#features/setup';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';

const markClasses: Record<StepMark, string> = {
  done: 'bg-success',
  next: 'bg-primary',
  open: 'border border-muted-foreground',
};

const markBase = 'size-6 shrink-0 items-center justify-center rounded-full';

const numberClasses: Record<Exclude<StepMark, 'done'>, string> = {
  next: 'text-primary-foreground',
  open: 'text-muted-foreground',
};

function MarkContent(props: {
  mark: StepMark;
  number: number;
}): React.JSX.Element {
  if (props.mark === 'done')
    return (
      <Icon name="check" role="body" className="text-primary-foreground" />
    );

  return (
    <Text role="badge" className={numberClasses[props.mark]}>
      {props.number}
    </Text>
  );
}

const markLabel = (mark: StepMark, number: number): string =>
  mark === 'done' ? 'Done' : `Step ${number}`;

function StepMarkView(props: {
  mark: StepMark;
  number: number;
}): React.JSX.Element {
  return (
    <View
      accessibilityLabel={markLabel(props.mark, props.number)}
      className={cn(markBase, markClasses[props.mark])}
    >
      <MarkContent {...props} />
    </View>
  );
}

export interface SetupStepProps {
  number: number;
  mark: StepMark;
  title: string;
  // Beside the title, such as GitHub's sign-in chip.
  chip?: ReactNode;
  caption: string;
  // Under the caption, such as a link to another account.
  footer?: ReactNode;
  action?: ReactNode;
}

function StepTitle(props: SetupStepProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      <Text accessibilityRole="heading" aria-level={2}>
        {props.title}
      </Text>
      {props.chip}
    </View>
  );
}

function StepBody(props: SetupStepProps): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5 pt-0.5">
      <StepTitle {...props} />
      <Text role="secondary" className="text-muted-foreground">
        {props.caption}
      </Text>
      {props.footer && (
        <View className="items-start pt-0.5">{props.footer}</View>
      )}
    </View>
  );
}

// One Onboarding step: its mark, what it is, and its action in a fixed slot so every step's buttons line up.
export function SetupStep(props: SetupStepProps): React.JSX.Element {
  return (
    <View className="flex-row items-start gap-3 py-4">
      <StepMarkView mark={props.mark} number={props.number} />
      <StepBody {...props} />
      {props.action && (
        <View className="w-33 shrink-0 flex-row justify-end">
          {props.action}
        </View>
      )}
    </View>
  );
}
