import type { MenuAction } from '@repo/kit/primitives/overlays/menu';
import { useState } from 'react';
import type { PermissionAnswers } from '../permission-request/use-permission-answers';
import type { RequestState } from '../request-card/request-card';
import {
  type BuildChoice,
  buildChoices,
  buildInNewSession,
} from './plan-build-choices';
import type { PlanRequestActions } from './plan-request';

interface PlanBuildInput extends PlanRequestActions {
  requestId: string;
  state: RequestState;
  answers: PermissionAnswers;
}

export interface PlanBuild {
  // What the Build button sends: the first way to build.
  lead: BuildChoice | undefined;
  label: string;
  // The chevron's rows: every way to build, then Save to workspace; each runs at once.
  actions: MenuAction[];
  send: () => void;
}

type Sent = { requestId: string; value: string } | undefined;

type Mark = (sent: Sent) => void;

// The Build split: the button builds, the chevron's rows build another way or save the plan.
export function usePlanBuild(input: PlanBuildInput): PlanBuild {
  const [sent, setSent] = useState<Sent>();
  const choices = planChoices(input);
  const lead = choices[0];

  const build = (choice: BuildChoice): void =>
    sendBuild(input, choice, setSent);

  return {
    lead,
    label: buildLabel(input, lead ?? noBuild, sent),
    actions: [...choices.map(buildAction(build)), ...saveAction(input)],
    send: () => lead && build(lead),
  };
}

const buildAction =
  (build: (choice: BuildChoice) => void) =>
  (choice: BuildChoice): MenuAction => ({
    label: choice.label,
    onPress: () => build(choice),
  });

const saveAction = ({ onSavePlan }: PlanBuildInput): MenuAction[] =>
  onSavePlan ? [{ label: 'Save to workspace', onPress: onSavePlan }] : [];

// A new Session is offered only where the Agent lets this Session keep planning.
const planChoices = ({
  answers,
  onBuildInNewSession,
}: PlanBuildInput): BuildChoice[] =>
  buildChoices(
    answers.choices.allow,
    Boolean(onBuildInNewSession && answers.leads.reject),
  );

const isSending = ({ state, requestId }: PlanBuildInput, sent: Sent): boolean =>
  state.kind === 'submitting' && sent?.requestId === requestId;

const buildLabel = (
  input: PlanBuildInput,
  lead: BuildChoice,
  sent: Sent,
): string => (isSending(input, sent) ? 'Sending…' : lead.label);

const noBuild: BuildChoice = { value: '', label: '' };

function sendBuild(
  input: PlanBuildInput,
  choice: BuildChoice,
  mark: Mark,
): void {
  if (input.answers.inactive) return;
  mark({ requestId: input.requestId, value: choice.value });
  sendChoice(input, choice);
}

function sendChoice(input: PlanBuildInput, choice: BuildChoice): void {
  if (choice === buildInNewSession) buildElsewhere(input);
  else chooseAllow(input.answers, choice.value);
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
