import { Button } from '@repo/kit/primitives/actions/button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { type StepMark } from '#features/setup';

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
    return <Icon name="check" size="sm" className="text-primary-foreground" />;

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
  // A step's add action in place of `action`, such as Add Agent.
  add?: StepAdd;
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

function StepAction(props: SetupStepProps): React.JSX.Element | null {
  const action = props.add ? (
    <StepButton {...props.add} mark={props.mark} />
  ) : (
    props.action
  );

  return action ? (
    <View className="w-33 shrink-0 flex-row justify-end">{action}</View>
  ) : null;
}

// One Onboarding step: its mark, what it is, and its action in a fixed slot so every step's buttons line up.
export function SetupStep(props: SetupStepProps): React.JSX.Element {
  return (
    <View className="flex-row items-start gap-3 py-4">
      <StepMarkView mark={props.mark} number={props.number} />
      <StepBody {...props} />
      <StepAction {...props} />
    </View>
  );
}

type StepAdd = {
  label: string;
  // Unset until the App can do what the button says, so it shows disabled.
  onPress?: () => void;
};

// A step's add action: filled with a + when the step is next, outlined otherwise.
function StepButton(props: StepAdd & { mark: StepMark }): React.JSX.Element {
  const next = props.mark === 'next';

  return (
    <Button
      label={props.label}
      icon={next ? 'add' : undefined}
      variant={next ? 'primary' : 'secondary'}
      size="sm"
      disabled={!props.onPress}
      onPress={props.onPress}
    />
  );
}
