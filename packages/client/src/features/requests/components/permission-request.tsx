import type {
  PendingPermission,
  PermissionOption,
  SessionAnswerPermissionInput,
} from '@repo/contracts';
import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { Textarea } from '#lib/generic/primitives/textarea';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Icon } from '../../../lib/generic/symbols/icon';
import { PermissionActions } from './permission-actions';
import {
  type PermissionChoices,
  permissionChoices,
} from './permission-choices';
import { RequestAction, RequestCard, type RequestState } from './request-card';

type PermissionAnswer = Pick<
  SessionAnswerPermissionInput,
  'optionId' | 'message'
>;

export interface PermissionRequestProps {
  request: PendingPermission;
  input?: string;
  reason?: string;
  // The Agent reads a message with a rejection; only then does rejecting open the message field.
  feedback?: boolean;
  denialMessage?: string;
  onDenialMessageChange: (message: string | undefined) => void;
  onAnswer: (answer: PermissionAnswer) => void;
  state: RequestState;
  error?: string;
}

export function PermissionRequest(
  props: PermissionRequestProps,
): React.JSX.Element {
  const answers = usePermissionAnswers(props);
  const { request, input, reason, state, error } = props;
  const alreadyAnswered = state.kind === 'answered';
  const { denying } = answers;

  return (
    <RequestCard
      state={state}
      error={error}
      onEnter={answers.enter}
      onEscape={answers.escape}
      footerClassName={cn('justify-end', denying && 'justify-between')}
      actions={
        denying ? (
          <DenialActions {...answers} />
        ) : (
          <PermissionActions
            choices={answers.choices}
            leads={answers.leads}
            main={answers.main}
            disabled={answers.inactive}
            label={answers.label}
            onChoose={answers.choose}
            onPick={answers.pick}
          />
        )
      }
    >
      <View className="gap-2 px-4 pt-4 pb-1">
        <View className="flex-row items-center gap-1.5">
          <Icon name="terminal" className="shrink-0 text-muted-foreground" />
          <Text role={'heading'} className="min-w-0 flex-1">
            {request.title}
          </Text>
        </View>
        {input && (
          <View className="rounded-md bg-secondary px-3 py-2">
            <Text role="code">{input}</Text>
          </View>
        )}
        {denying && !alreadyAnswered ? (
          <DenialField
            message={props.denialMessage ?? ''}
            editable={!answers.inactive}
            onChange={props.onDenialMessageChange}
            onSubmit={answers.deny}
          />
        ) : null}
        {(!denying || alreadyAnswered) && reason && (
          <Text role="secondary">{reason}</Text>
        )}
      </View>
    </RequestCard>
  );
}

type Leads = Partial<Record<keyof PermissionChoices, PermissionOption>>;

interface PermissionAnswers {
  choices: PermissionChoices;
  leads: Leads;
  pick: (option: PermissionOption) => void;
  main: PermissionOption;
  denial: PermissionOption | undefined;
  denying: boolean;
  inactive: boolean;
  label: (option: PermissionOption) => string;
  choose: (option: PermissionOption) => void;
  deny: () => void;
  enter: () => void;
  escape: (() => void) | undefined;
  back: () => void;
}

function usePermissionAnswers({
  request,
  feedback = false,
  denialMessage,
  onDenialMessageChange,
  onAnswer,
  state,
}: PermissionRequestProps): PermissionAnswers {
  // The option sent for this request, so its button reads Sending….
  const [sent, setSent] = useState<{ requestId: string; optionId: string }>();
  const chosen =
    sent?.requestId === request.requestId ? sent.optionId : undefined;
  // The option the chevron picked for each group of this request.
  const [picked, setPicked] = useState<{ requestId: string; ids: string[] }>();
  const pickedIds = picked?.requestId === request.requestId ? picked.ids : [];
  const choices = permissionChoices(request.options);
  const leads = groupLeads(choices, pickedIds);
  const main = mainOption(leads);
  const denial = feedback ? choices.reject[0] : undefined;
  const denying = denial !== undefined && denialMessage !== undefined;
  const inactive = state.kind !== 'open';
  const send = (answer: PermissionAnswer): void => {
    if (inactive) return;
    setSent({ requestId: request.requestId, optionId: answer.optionId });
    onAnswer(answer);
  };
  const choose = (option: PermissionOption): void => {
    if (option === denial && !inactive) onDenialMessageChange('');
    else send({ optionId: option.optionId });
  };
  const deny = (): void => {
    if (!denial) return;
    const message = denialMessage?.trim();
    send({ optionId: denial.optionId, ...(message ? { message } : {}) });
  };
  const back = (): void => onDenialMessageChange(undefined);
  const pick = (option: PermissionOption): void => {
    const group = choices.allow.includes(option)
      ? choices.allow
      : choices.reject;
    setPicked({
      requestId: request.requestId,
      ids: [
        ...pickedIds.filter((id) => !group.some((o) => o.optionId === id)),
        option.optionId,
      ],
    });
  };
  return {
    choices,
    leads,
    pick,
    main,
    denial,
    denying,
    inactive,
    label: (option) =>
      state.kind === 'submitting' &&
      (chosen ?? main.optionId) === option.optionId
        ? 'Sending…'
        : option.name,
    choose,
    deny,
    back,
    enter: () => (denying ? deny() : choose(main)),
    escape: denial && (() => (denying ? back() : choose(denial))),
  };
}

// Each group's picked option, or its first: allow-once and reject-once lead when offered.
function groupLeads(choices: PermissionChoices, pickedIds: string[]): Leads {
  const lead = (options: PermissionOption[]): PermissionOption | undefined =>
    options.find(({ optionId }) => pickedIds.includes(optionId)) ?? options[0];
  return { allow: lead(choices.allow), reject: lead(choices.reject) };
}

// The option Enter chooses: the allow group's lead when the Agent offers one.
function mainOption({ allow, reject }: Leads): PermissionOption {
  const main = allow ?? reject;
  if (!main) throw new Error('A Permission request offers at least one option');
  return main;
}

function DenialActions({
  denial,
  inactive,
  label,
  deny,
  back,
}: PermissionAnswers): ReactNode {
  const wide = useContentWide();
  if (!denial) return null;
  return (
    <>
      <RequestAction
        disabled={inactive}
        className={wide ? 'flex-none bg-transparent' : 'flex-1 bg-secondary'}
        onPress={back}
      >
        Back
      </RequestAction>
      <RequestAction
        primary
        disabled={inactive}
        className={wide ? 'flex-none' : 'flex-1'}
        onPress={deny}
      >
        {label(denial)}
      </RequestAction>
    </>
  );
}

function DenialField({
  message,
  editable,
  onChange,
  onSubmit,
}: {
  message: string;
  editable: boolean;
  onChange: (message: string) => void;
  onSubmit: () => void;
}): ReactNode {
  return (
    <View className="gap-1.5 pt-1">
      <Text role="body">What should the Agent do instead?</Text>
      <Textarea
        accessibilityLabel="What should the Agent do instead?"
        autoFocus
        value={message}
        editable={editable}
        onChangeText={onChange}
        submitBehavior="submit"
        returnKeyType="send"
        onSubmitEditing={Platform.OS === 'web' ? undefined : onSubmit}
        className="min-h-16 bg-background dark:bg-background type-control web:resize-none web:focus-visible:ring-ring/25"
      />
      <Text role="secondary">
        Optional. The Agent reads it with the denial.
      </Text>
    </View>
  );
}
