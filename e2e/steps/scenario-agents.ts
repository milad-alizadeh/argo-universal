import {
  type AppFixtureAgents,
  appFixtureAgentIds,
} from '@repo/mocks/agent/app-fixtures';
import { z } from 'zod';

const Availability = z.enum(['not installed', 'not signed in']);
export type Unavailable = z.infer<typeof Availability>;

export function agentId(ordinal: number): string {
  const id = appFixtureAgentIds[ordinal - 1];
  if (!id) throw new Error(`No Agent at position ${ordinal}`);
  return id;
}

export function availabilityValue(
  state: Unavailable,
): 'not_installed' | 'not_signed_in' {
  return state === 'not installed' ? 'not_installed' : 'not_signed_in';
}

function unavailableAgents(ordinal: string, state: string): AppFixtureAgents {
  const availability = availabilityValue(Availability.parse(state));
  const ids =
    ordinal === 'every' ? appFixtureAgentIds : [agentId(Number(ordinal))];
  return Object.fromEntries(
    ids.map((id): [string, { availability: typeof availability }] => [
      id,
      { availability },
    ]),
  );
}

function unavailableConfiguration(match: RegExpExecArray): AppFixtureAgents {
  return unavailableAgents(match[1] ?? 'every', match[2] ?? '');
}

function configurationForStep(step: string): AppFixtureAgents {
  const unavailable =
    /^(?:Given|And) (?:Agent (\d+)|(?:every) Agent) is "([^"]+)"$/.exec(step);
  if (unavailable) return unavailableConfiguration(unavailable);
  const refusing = /^(?:Given|And) Agent (\d+) refuses to open a Session$/.exec(
    step,
  );
  if (refusing)
    return { [agentId(Number(refusing[1]))]: { scenario: 'refuse-session' } };
  return {};
}

const attachmentScenarios = [
  [/^(?:When|And) I attach the red square image$/, 'image'],
  [/^(?:When|And) I attach the release notes file$/, 'file'],
] as const;

const attachedScenario = (
  steps: string[],
): (typeof attachmentScenarios)[number][1] | undefined =>
  attachmentScenarios.find(([attach]) =>
    steps.some((step) => attach.test(step)),
  )?.[1];

const chosenAgent = (steps: string[]): string | undefined => {
  const chosen = steps
    .map((step) => /^(?:Given|And) a New Session with Agent (\d+)$/.exec(step))
    .find((match) => match !== null);
  return chosen ? agentId(Number(chosen[1])) : undefined;
};

// An Agent that is given an attachment answers with that attachment's scenario.
function attachmentConfiguration(steps: string[]): AppFixtureAgents {
  const scenario = attachedScenario(steps);
  const agent = chosenAgent(steps);
  return scenario && agent ? { [agent]: { scenario } } : {};
}

export function scenarioAgents(steps: string[]): AppFixtureAgents {
  return Object.assign(
    {},
    ...steps.map(configurationForStep),
    attachmentConfiguration(steps),
  );
}
