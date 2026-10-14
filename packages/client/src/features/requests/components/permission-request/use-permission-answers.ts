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

type PermissionAnswer = Pick<
  SessionAnswerPermissionInput,
  'optionId' | 'message'
>;

export interface PermissionAnswersInput {
  request: PendingPermission;
  // The Agent reads a message with a rejection; only then does rejecting open the message field.
  feedback?: boolean;
  denialMessage?: string;
  onDenialMessageChange: (message: string | undefined) => void;
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

interface DenialFlow {
  denying: boolean;
  choose: (option: PermissionOption) => void;
  deny: () => void;
  enter: () => void;
  escape: (() => void) | undefined;
  back: () => void;
}

export interface PermissionAnswers extends PickedLeads, DenialFlow {
  denial: PermissionOption | undefined;
  inactive: boolean;
  label: (option: PermissionOption) => string;
}

type Send = (answer: PermissionAnswer) => void;

export function usePermissionAnswers(
  props: PermissionAnswersInput,
): PermissionAnswers {
  const picks = usePickedLeads(props.request);
  const { chosen, send } = useSend(props);
  const inactive = props.state.kind !== 'open';
  const denial = props.feedback ? picks.choices.reject[0] : undefined;

  return {
    ...picks,
    denial,
    inactive,
    label: sendingLabel(props.state, chosen ?? picks.main.optionId),
    ...denialFlow({ ...props, denial, inactive, main: picks.main, send }),
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

type Sending = { chosen: string | undefined; send: Send };

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

type DenialFlowInput = PermissionAnswersInput &
  Pick<PermissionAnswers, 'denial' | 'inactive' | 'main'> & { send: Send };

type DenialCommands = Pick<DenialFlow, 'choose' | 'deny' | 'back'>;

function denialFlow(input: DenialFlowInput): DenialFlow {
  const { denial, main } = input;
  const denying = denial !== undefined && input.denialMessage !== undefined;
  const { choose, deny, back } = denialCommands(input);

  return {
    denying,
    choose,
    deny,
    back,
    enter: () => (denying ? deny() : choose(main)),
    escape: denial && (() => (denying ? back() : choose(denial))),
  };
}

// Choosing the denial opens the message field; Back closes it.
function denialCommands(input: DenialFlowInput): DenialCommands {
  const { denial, send, onDenialMessageChange: setDenialMessage } = input;

  return {
    choose: (option) => {
      if (option === denial && !input.inactive) setDenialMessage('');
      else send({ optionId: option.optionId });
    },
    deny: () => {
      if (denial) send(denialAnswer(denial, input.denialMessage));
    },
    back: () => setDenialMessage(undefined),
  };
}

// The denial, with the message when the user wrote one.
function denialAnswer(
  denial: PermissionOption,
  denialMessage: string | undefined,
): PermissionAnswer {
  const message = denialMessage?.trim();
  const answer: PermissionAnswer = { optionId: denial.optionId };

  if (message) answer.message = message;

  return answer;
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
