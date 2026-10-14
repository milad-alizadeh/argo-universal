import {
  type AppFixtureAgents,
  appFixtureAgentIds,
} from '@repo/mocks/agent/app-fixtures';
import { z } from 'zod';

const SetupState = z.enum(['not installed', 'sign-in needed', "can't start"]);
export type SetupState = z.infer<typeof SetupState>;

export function agentId(ordinal: number): string {
  const id = appFixtureAgentIds[ordinal - 1];
  if (!id) throw new Error(`No Agent at position ${ordinal}`);
  return id;
}

// The Readiness status the Server's own check reports for each state.
export const setupStatuses: Record<SetupState, string> = {
  'not installed': 'not-installed',
  'sign-in needed': 'sign-in-needed',
  "can't start": 'cant-start',
};
const setupFixtures: Record<SetupState, AppFixtureAgents[string]> = {
  'not installed': { installed: false },
  'sign-in needed': { scenario: 'signed-out' },
  "can't start": { scenario: 'cant-start' },
};

function agentsNeedingSetup(ordinal: string, state: string): AppFixtureAgents {
  const fixture = setupFixtures[SetupState.parse(state)];
  const ids =
    ordinal === 'every' ? appFixtureAgentIds : [agentId(Number(ordinal))];
  return Object.fromEntries(ids.map((id) => [id, fixture]));
}

function setupConfiguration(match: RegExpExecArray): AppFixtureAgents {
  return agentsNeedingSetup(match[1] ?? 'every', match[2] ?? '');
}

function configurationForStep(step: string): AppFixtureAgents {
  const needsSetup =
    /^(?:Given|And) (?:Agent (\d+)|(?:every) Agent) is "([^"]+)"$/.exec(step);
  if (needsSetup) return setupConfiguration(needsSetup);
  const refusing =
    /^(?:Given|And) (?:Agent (\d+)|every Agent) refuses to (open|reopen) a Session$/.exec(
      step,
    );
  return refusing ? refusingConfiguration(refusing) : heldConfiguration(step);
}

function heldConfiguration(step: string): AppFixtureAgents {
  const held =
    /^(?:Given|And) Agent (\d+)'s readiness check never answers$/.exec(step);
  return held ? { [agentId(Number(held[1]))]: { scenario: 'check-held' } } : {};
}

function refusingConfiguration(match: RegExpExecArray): AppFixtureAgents {
  const scenario = match[2] === 'open' ? 'refuse-session' : 'refuse-reopen';
  const ids = match[1] ? [agentId(Number(match[1]))] : appFixtureAgentIds;
  return Object.fromEntries(ids.map((id) => [id, { scenario }]));
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
