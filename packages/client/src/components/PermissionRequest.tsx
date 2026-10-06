import type {
  PendingPermission,
  SessionAnswerPermissionInput,
} from '@repo/contracts';
import { TerminalWindowIcon } from 'phosphor-react-native';
import { Platform, View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Textarea } from '#primitives/textarea';
import { useWide } from '../navigation/use-wide';
import { Icon } from './Icon';
import { AlreadyAnswered, RequestAction, RequestCard } from './RequestCard';
import { useRequestShortcuts } from './use-request-shortcuts';

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
  submitting?: boolean;
  alreadyAnswered?: string;
  error?: string;
}

export function PermissionRequest({
  request,
  input,
  reason,
  denialMessage,
  onDenialMessageChange,
  onAnswer,
  submitting = false,
  alreadyAnswered,
  error,
}: PermissionRequestProps) {
  const wide = useWide();
  const denying = denialMessage !== undefined;
  const inactive = submitting || !!alreadyAnswered;
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

  const nativeId = useRequestShortcuts({
    inactive,
    onEnter: answer,
    onEscape: () => onDenialMessageChange(denying ? undefined : ''),
  });

  return (
    <RequestCard nativeID={nativeId}>
      <View
        className={cn('gap-2 px-4 pt-4 pb-1', alreadyAnswered && 'opacity-50')}
      >
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
      {error && (
        <Text
          role="alert"
          className="px-4 pt-3 text-sm leading-5 text-destructive"
        >
          {error}
        </Text>
      )}
      <View
        className={cn(
          'min-h-13 flex-row items-center justify-end gap-1 px-2 pt-3 pb-2',
          denying && 'justify-between',
        )}
      >
        {alreadyAnswered && <AlreadyAnswered reason={alreadyAnswered} />}
        {(!alreadyAnswered || wide) && (
          <>
            <RequestAction
              disabled={inactive}
              className="flex-1 bg-secondary wide:flex-none wide:bg-transparent"
              onPress={() => onDenialMessageChange(denying ? undefined : '')}
            >
              {denying ? 'Back' : 'Deny'}
            </RequestAction>
            <RequestAction
              primary
              disabled={inactive}
              className="flex-1 wide:flex-none"
              onPress={answer}
            >
              {submitting ? 'Sending…' : answerLabel}
            </RequestAction>
          </>
        )}
      </View>
    </RequestCard>
  );
}
