import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { Text } from '#primitives/display/text/text';
import { Textarea } from '#primitives/inputs/textarea/textarea';
import { RequestAction } from '../request-card/request-card';
import { useFocusOnMount } from '../use-focus-on-mount';
import type {
  PermissionAnswers,
  PermissionAnswersInput,
} from './use-permission-answers';

type DenialInput = PermissionAnswersInput & { answers: PermissionAnswers };

const denialQuestion = 'What should the Agent do instead?';

const denialLayouts = {
  wide: { row: 'flex-row gap-1', action: 'flex-none' },
  phone: { row: 'w-full flex-col-reverse gap-2', action: undefined },
};

const messageFieldProps = {
  accessibilityLabel: denialQuestion,
  submitBehavior: 'submit',
  returnKeyType: 'send',
  className:
    'min-h-16 bg-background dark:bg-background type-control web:resize-none web:focus-visible:ring-ring/25',
} as const;

export function DenialActions(answers: PermissionAnswers): ReactNode {
  const layout = useContentWide() ? denialLayouts.wide : denialLayouts.phone;
  if (!answers.denial) return null;
  const action = { disabled: answers.inactive, className: layout.action };
  return (
    <View className={layout.row}>
      <RequestAction {...action} onPress={answers.back}>
        Back
      </RequestAction>
      <RequestAction {...action} primary onPress={answers.deny}>
        {answers.label(answers.denial)}
      </RequestAction>
    </View>
  );
}

export function DenialField(input: DenialInput): ReactNode {
  if (input.state.kind === 'answered') return null;
  return (
    <View className="gap-1.5 pt-1">
      <Text role="body">{denialQuestion}</Text>
      <DenialMessage {...input} />
      <Text role="secondary">
        Optional. The Agent reads it with the denial.
      </Text>
    </View>
  );
}

function DenialMessage(input: DenialInput): ReactNode {
  const { answers } = input;
  return (
    <Textarea
      {...messageFieldProps}
      ref={useFocusOnMount()}
      value={input.denialMessage ?? ''}
      editable={!answers.inactive}
      onChangeText={input.onDenialMessageChange}
      onSubmitEditing={Platform.OS === 'web' ? undefined : answers.deny}
    />
  );
}
