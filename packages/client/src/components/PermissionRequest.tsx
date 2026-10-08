import type {
  PendingPermission,
  SessionAnswerPermissionInput,
} from '@repo/contracts';
import { TerminalWindowIcon } from 'phosphor-react-native';
import { Platform, View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Textarea } from '#primitives/textarea';
import { Icon } from '../lib/icon';
import { useContentWide } from './ContentLayout';
import { RequestAction, RequestCard, type RequestState } from './RequestCard';

export type PermissionAnswer = Pick<
  SessionAnswerPermissionInput,
  'optionId' | 'message'
>;

export interface PermissionRequestProps {
  request: PendingPermission;
  input?: string;
  reason?: string;
  denialMessage?: string;
  onDenialMessageChange: (message: string | undefined) => void;
  onAnswer: (answer: PermissionAnswer) => void;
  state: RequestState;
  error?: string;
}

export function PermissionRequest({
  request,
  input,
  reason,
  denialMessage,
  onDenialMessageChange,
  onAnswer,
  state,
  error,
}: PermissionRequestProps) {
  const wide = useContentWide();
  const submitting = state.kind === 'submitting';
  const alreadyAnswered = state.kind === 'answered';
  const denying = denialMessage !== undefined;
  const inactive = submitting || alreadyAnswered;
  const answerLabel = denying ? 'Deny' : 'Allow once';
  const answer = () => {
    if (inactive) return;
    onAnswer(
      denying
        ? {
            optionId: 'reject_once',
            ...(denialMessage.trim() ? { message: denialMessage.trim() } : {}),
          }
        : { optionId: 'allow_once' },
    );
  };

  return (
    <RequestCard
      state={state}
      error={error}
      onEnter={answer}
      onEscape={() => onDenialMessageChange(denying ? undefined : '')}
      footerClassName={cn('justify-end', denying && 'justify-between')}
      actions={
        <>
          <RequestAction
            disabled={inactive}
            className={
              wide ? 'flex-none bg-transparent' : 'flex-1 bg-secondary'
            }
            onPress={() => onDenialMessageChange(denying ? undefined : '')}
          >
            {denying ? 'Back' : 'Deny'}
          </RequestAction>
          <RequestAction
            primary
            disabled={inactive}
            className={wide ? 'flex-none' : 'flex-1'}
            onPress={answer}
          >
            {submitting ? 'Sending…' : answerLabel}
          </RequestAction>
        </>
      }
    >
      <View className="gap-2 px-4 pt-4 pb-1">
        <View className="flex-row items-center gap-1.5">
          <Icon
            as={TerminalWindowIcon}
            size="md"
            className="shrink-0 text-muted-foreground"
          />
          <Text className="min-w-0 flex-1 text-sm font-semibold leading-5.5">
            {request.title}
          </Text>
        </View>
        {input && (
          <View className="rounded-md bg-secondary px-3 py-2">
            <Text className="font-mono text-xs leading-5">{input}</Text>
          </View>
        )}
        {denying && !alreadyAnswered ? (
          <View className="gap-1.5 pt-1">
            <Text className="text-sm font-medium leading-5">
              What should the Agent do instead?
            </Text>
            <Textarea
              accessibilityLabel="What should the Agent do instead?"
              autoFocus
              value={denialMessage}
              editable={!inactive}
              onChangeText={onDenialMessageChange}
              submitBehavior="submit"
              returnKeyType="send"
              onSubmitEditing={Platform.OS === 'web' ? undefined : answer}
              className="min-h-16 bg-background dark:bg-background text-sm leading-5 web:resize-none web:focus-visible:ring-ring/25"
            />
            <Text className="text-sm leading-5 text-muted-foreground">
              Optional. The Agent reads it with the denial.
            </Text>
          </View>
        ) : null}
        {(!denying || alreadyAnswered) && reason && (
          <Text className="text-sm leading-5 text-muted-foreground">
            {reason}
          </Text>
        )}
      </View>
    </RequestCard>
  );
}
