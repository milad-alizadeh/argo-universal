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

  const refusing =
    /^(?:Given|And) Agent (\d+) refuses to (open|reopen) a Session$/.exec(step);

  return refusing ? refusingConfiguration(refusing) : {};
}

function refusingConfiguration(match: RegExpExecArray): AppFixtureAgents {
  const scenario = match[2] === 'open' ? 'refuse-session' : 'refuse-reopen';

  return { [agentId(Number(match[1]))]: { scenario } };
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
    elicitationConfiguration(steps),
    feedHistoryConfiguration(steps),
    liveFeedConfiguration(steps),
    exitConfiguration(steps),
    signInConfiguration(steps),
  );
}

// A sign-in fixture step names its Agent by ordinal.
const agentStep = (text: string): RegExp =>
  new RegExp(`^(?:Given|And) Agent (\\d+) ${text}$`);

const signInSteps = [
  [agentStep('needs sign-in'), 'sign-in-required'],
  [agentStep('offers two sign-in methods'), 'sign-in-methods'],
  [agentStep('holds its sign-in'), 'sign-in-held'],
  [agentStep('signs in through a terminal'), 'terminal-sign-in-required'],
  [agentStep('ends its first Turn needing sign-in'), 'turn-auth-required'],
  [
    agentStep('ends its first Turn needing a terminal sign-in'),
    'turn-terminal-sign-in',
  ],
  [agentStep('exits while opening its first Session'), 'open-exit-once'],
] as const;

// Sign-in and launch fixtures for the callouts above the Composer.
function signInConfiguration(steps: string[]): AppFixtureAgents {
  return Object.assign(
    {},
    ...steps.flatMap((step) =>
      signInSteps.flatMap(([pattern, scenario]) => {
        const match = pattern.exec(step);

        return match ? [{ [agentId(Number(match[1]))]: { scenario } }] : [];
      }),
    ),
  );
}

function feedHistoryConfiguration(steps: string[]): AppFixtureAgents {
  const chosen = steps
    .map((step) =>
      /^(?:Given|And) Agent (\d+) supplies a long Feed history$/.exec(step),
    )
    .find((match) => match !== null);

  return chosen
    ? { [agentId(Number(chosen[1]))]: { scenario: 'feed-history' } }
    : {};
}

function elicitationConfiguration(steps: string[]): AppFixtureAgents {
  const chosen = steps
    .map((step) =>
      /^(?:Given|And) Agent (\d+) asks for an Elicitation$/.exec(step),
    )
    .find((match) => match !== null);

  return chosen
    ? { [agentId(Number(chosen[1]))]: { scenario: 'elicitation' } }
    : {};
}

const liveFeedStep =
  /^(?:Given|And) Agent (\d+) supplies (edits and commands|an unfinished command)$/;

function liveFeedConfiguration(steps: string[]): AppFixtureAgents {
  const chosen = steps
    .map((step) => liveFeedStep.exec(step))
    .find((match) => match !== null);

  return chosen
    ? {
        [agentId(Number(chosen[1]))]: {
          scenario:
            chosen[2] === 'edits and commands'
              ? 'feed-work'
              : 'feed-interrupted',
        },
      }
    : {};
}

function exitConfiguration(steps: string[]): AppFixtureAgents {
  return steps.some((step) =>
    /^(?:Given|And) Agent 1 exits mid-Turn with stderr$/.test(step),
  )
    ? { [agentId(1)]: { scenario: 'exit-with-stderr' } }
    : {};
}
