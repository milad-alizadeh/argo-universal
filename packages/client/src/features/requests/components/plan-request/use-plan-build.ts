import { useState } from 'react';
import type { PermissionAnswers } from '../permission-request/use-permission-answers';
import type { RequestState } from '../request-card/request-card';
import {
  type BuildChoice,
  buildChoices,
  buildInNewSession,
} from './plan-build-choices';

interface PlanBuildInput {
  requestId: string;
  state: RequestState;
  answers: PermissionAnswers;
  onBuildInNewSession?: () => void;
}

export interface PlanBuild {
  choices: BuildChoice[];
  // What the Build button sends now; the chevron changes it.
  lead: BuildChoice | undefined;
  label: string;
  pick: (value: string) => void;
  send: () => void;
}

type Marked = { requestId: string; value: string } | undefined;

type Mark = (marked: Marked) => void;

const markedValue = (marked: Marked, requestId: string): string | undefined =>
  marked?.requestId === requestId ? marked.value : undefined;

// The Build split: its chosen way to build, and sending it. A new Session keeps this one planning and opens with the plan.
export function usePlanBuild(input: PlanBuildInput): PlanBuild {
  const [picked, setPicked] = useState<Marked>();
  const [sent, setSent] = useState<Marked>();
  const choices = planChoices(input);
  const lead = pickedChoice(choices, markedValue(picked, input.requestId));

  return {
    choices,
    lead,
    label: buildLabel(input, lead ?? noBuild, sent),
    pick: (value) => setPicked({ requestId: input.requestId, value }),
    send: () => sendBuild(input, lead, setSent),
  };
}

// The chevron's pick, else the first way to build.
const pickedChoice = (
  choices: BuildChoice[],
  pickedValue: string | undefined,
): BuildChoice | undefined =>
  choices.find(({ value }) => value === pickedValue) ?? choices[0];

// A new Session is offered only where the Agent lets this Session keep planning.
const planChoices = ({
  answers,
  onBuildInNewSession,
}: PlanBuildInput): BuildChoice[] =>
  buildChoices(
    answers.choices.allow,
    Boolean(onBuildInNewSession && answers.leads.reject),
  );

const noBuild: BuildChoice = { value: '', label: '' };

const isSending = (
  state: RequestState,
  lead: BuildChoice,
  sentValue: string | undefined,
): boolean => state.kind === 'submitting' && sentValue === lead.value;

function buildLabel(
  { state, requestId }: PlanBuildInput,
  lead: BuildChoice,
  sent: Marked,
): string {
  const sentValue = markedValue(sent, requestId);

  return isSending(state, lead, sentValue) ? 'Sending…' : lead.label;
}

function sendBuild(
  input: PlanBuildInput,
  lead: BuildChoice | undefined,
  mark: Mark,
): void {
  if (!lead || input.answers.inactive) return;
  mark({ requestId: input.requestId, value: lead.value });
  sendChoice(input, lead);
}

function sendChoice(input: PlanBuildInput, lead: BuildChoice): void {
  if (lead === buildInNewSession) buildElsewhere(input);
  else chooseAllow(input.answers, lead.value);
}

// This Session keeps planning; the new one opens with the plan.
function buildElsewhere({
  answers,
  onBuildInNewSession,
}: PlanBuildInput): void {
  const reject = answers.leads.reject;

  if (!reject) return;
  answers.choose(reject);
  onBuildInNewSession?.();
}

function chooseAllow(answers: PermissionAnswers, optionId: string): void {
  const option = answers.choices.allow.find(
    (allow) => allow.optionId === optionId,
  );

  if (option) answers.choose(option);
}
