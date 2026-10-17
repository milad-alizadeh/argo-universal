import type {
  PendingPermission,
  PermissionOption,
  SessionAnswerPermissionInput,
} from '@repo/contracts';
import { useState } from 'react';
import type { RequestState } from '../request-card/request-card';
import {
  type PermissionChoices,
  permissionChoices,
} from './permission-choices';

type PermissionAnswer = Pick<SessionAnswerPermissionInput, 'optionId'>;

export interface PermissionAnswersInput {
  request: PendingPermission;
  onAnswer: (answer: PermissionAnswer) => void;
  state: RequestState;
}

type Leads = Partial<Record<keyof PermissionChoices, PermissionOption>>;

interface PickedLeads {
  choices: PermissionChoices;
  leads: Leads;
  pick: (option: PermissionOption) => void;
  main: PermissionOption;
}

export interface PermissionAnswers extends PickedLeads {
  inactive: boolean;
  label: (option: PermissionOption) => string;
  choose: (option: PermissionOption) => void;
  enter: () => void;
}

export function usePermissionAnswers(
  props: PermissionAnswersInput,
): PermissionAnswers {
  const picks = usePickedLeads(props.request);
  const { chosen, send } = useSend(props);

  const choose = (option: PermissionOption): void =>
    send({ optionId: option.optionId });

  return {
    ...picks,
    inactive: props.state.kind !== 'open',
    label: sendingLabel(props.state, chosen ?? picks.main.optionId),
    choose,
    enter: () => choose(picks.main),
  };
}

// The option the chevron picked for each group of this request.
function usePickedLeads(request: PendingPermission): PickedLeads {
  const [picked, setPicked] = useState<{ requestId: string; ids: string[] }>();
  const pickedIds = picked?.requestId === request.requestId ? picked.ids : [];
  const choices = permissionChoices(request.options);
  const leads = groupLeads(choices, pickedIds);

  const pick = (option: PermissionOption): void =>
    setPicked({
      requestId: request.requestId,
      ids: repick(choices, pickedIds, option),
    });

  return { choices, leads, pick, main: mainOption(leads) };
}

type Sending = {
  chosen: string | undefined;
  send: (answer: PermissionAnswer) => void;
};

// The option sent for this request, so its button reads Sending….
function useSend(input: PermissionAnswersInput): Sending {
  const { request, state, onAnswer } = input;
  const [sent, setSent] = useState<{ requestId: string; optionId: string }>();

  const send = (answer: PermissionAnswer): void => {
    if (state.kind !== 'open') return;
    setSent({ requestId: request.requestId, optionId: answer.optionId });
    onAnswer(answer);
  };

  const chosen =
    sent?.requestId === request.requestId ? sent.optionId : undefined;

  return { chosen, send };
}

const sendingLabel =
  (state: RequestState, sendingId: string) =>
  (option: PermissionOption): string =>
    state.kind === 'submitting' && sendingId === option.optionId
      ? 'Sending…'
      : option.name;

// The picked ids with the option replacing any earlier pick from its group.
function repick(
  choices: PermissionChoices,
  pickedIds: string[],
  option: PermissionOption,
): string[] {
  const group = choices.allow.includes(option) ? choices.allow : choices.reject;

  const others = pickedIds.filter(
    (id) => !group.some(({ optionId }) => optionId === id),
  );

  return [...others, option.optionId];
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
