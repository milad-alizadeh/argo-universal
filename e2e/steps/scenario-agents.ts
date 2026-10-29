import {
  type AppFixtureAgents,
  appFixtureAgentIds,
} from '@repo/mocks/agent/app-fixtures';
import { agentScenarioSteps, agentStep } from './agent-steps';
import { signInScenarios } from './sign-in-agents';

export function agentId(ordinal: number): string {
  const id = appFixtureAgentIds[ordinal - 1];

  if (!id) throw new Error(`No Agent at position ${ordinal}`);

  return id;
}

function configurationForStep(step: string): AppFixtureAgents {
  const refusing =
    /^(?:Given|And) Agent (\d+) refuses to (open|reopen) a Session$/.exec(step);

  if (refusing) return refusingConfiguration(refusing);

  if (/^(?:Given|And) no Agents are installed$/.test(step))
    return Object.fromEntries(
      appFixtureAgentIds.map((id) => [id, { installed: false }]),
    );

  return {};
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
    namedScenarioConfiguration(steps),
    liveFeedConfiguration(steps),
    exitConfiguration(steps),
    notificationConfiguration(steps),
    desktopConfiguration(steps),
    unreadConfiguration(steps),
    signInConfiguration(steps),
  );
}

const namedScenarioSteps = [
  [agentStep('delegates work through the argo CLI'), 'session-delegation'],
  [agentStep('starts a Shell when released'), 'shell-live'],
  [agentStep('edits a file and keeps its Turn running'), 'changed-files'],
  [agentStep('supplies a long Feed history'), 'feed-history'],
  [agentStep('asks for an Elicitation'), 'elicitation'],
  [agentStep('asks to leave plan mode'), 'leave-plan-mode'],
  [agentStep('asks permission to edit README.md'), 'permission'],
  [agentStep('offers the "review" Slash command'), 'slash-commands-review'],
  [agentStep('offers the "deploy" Slash command'), 'slash-commands-deploy'],
  [agentStep('asks permission to run a command'), 'permission-command'],
  [
    agentStep('asks permission before its command details arrive'),
    'permission-command-late',
  ],
  [agentStep('holds its first Turn until released'), 'held-until-released'],
  [
    agentStep('names its Session after a question'),
    'agent-title-after-question',
  ],
] as const;

function namedScenarioConfiguration(steps: string[]): AppFixtureAgents {
  return Object.fromEntries(
    agentScenarioSteps(namedScenarioSteps, steps).map(([ordinal, scenario]) => [
      agentId(ordinal),
      { scenario },
    ]),
  );
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

function desktopConfiguration(steps: string[]): AppFixtureAgents {
  return steps.some(
    (step) =>
      step.endsWith('I start a desktop Session that keeps running') ||
      step.endsWith('that waits for input'),
  )
    ? { [agentId(1)]: { scenario: 'permission' } }
    : {};
}

// A Turn left running for the Engine restart to end: Agent 1 holds an unfinished command.
function unreadConfiguration(steps: string[]): AppFixtureAgents {
  return steps.some((step) =>
    /^(?:Given|When|And) (?:a Turn ends while I am away from the Session |an unread Session in a phone Frame$)/.test(
      step,
    ),
  )
    ? { [agentId(1)]: { scenario: 'feed-interrupted' } }
    : {};
}

function notificationConfiguration(steps: string[]): AppFixtureAgents {
  return steps.some((step) =>
    /^(?:Given|And) Agent 1 asks successive questions$/.test(step),
  )
    ? { [agentId(1)]: { scenario: 'successive-input' } }
    : {};
}

function signInConfiguration(steps: string[]): AppFixtureAgents {
  return Object.fromEntries(
    signInScenarios(steps).map(([ordinal, scenario]) => [
      agentId(ordinal),
      { scenario },
    ]),
  );
}
