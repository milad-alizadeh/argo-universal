import type { PermissionOption } from '@repo/contracts';

// One way to build the plan: an allow option the Agent offered, or Argo's own new Session.
export interface BuildChoice {
  value: string;
  label: string;
}

export const buildInNewSession: BuildChoice = {
  value: 'argo:build-in-new-session',
  label: 'Build in new Session',
};

const kindLabels: Partial<Record<PermissionOption['kind'], string>> = {
  allow_once: 'Build',
  allow_always: 'Build, auto-accept edits',
};

// Allowing a request to leave plan mode builds the plan; a label two options would share keeps the Agent's own name.
function buildLabel(
  option: PermissionOption,
  allow: PermissionOption[],
): string {
  const shared = allow.filter(({ kind }) => kind === option.kind).length > 1;

  return (!shared && kindLabels[option.kind]) || option.name;
}

export function buildChoices(
  allow: PermissionOption[],
  newSession: boolean,
): BuildChoice[] {
  const agentChoices = allow.map((option) => ({
    value: option.optionId,
    label: buildLabel(option, allow),
  }));

  return newSession ? [...agentChoices, buildInNewSession] : agentChoices;
}
