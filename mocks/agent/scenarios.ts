import type { SessionUpdate } from '@agentclientprotocol/sdk';
import {
  acpConfiguration,
  heldModeSteps,
  smallModelUpdate,
} from './acp-configuration.ts';
import { cancellableScenarios } from './cancellable-scenarios.ts';
import { changedFilesSteps } from './changed-files-scenario.ts';
import { contextUsageScenarios } from './context-usage.ts';
import { delegationSteps } from './delegation-scenario.ts';
import { feedHistorySteps } from './feed-history-scenario.ts';
import {
  feedWorkSteps,
  feedWorkReplySteps,
  unfinishedFeedWorkSteps,
} from './feed-work-scenario.ts';
import { notificationScenarios } from './notification-scenarios.ts';
import { permissionScenarios } from './permission-command-scenario.ts';
import { planModeScenarios } from './plan-mode-scenario.ts';
import { agentExit, exitScenarios } from './process-exit-scenarios.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';
import { shellScenarios } from './shell-scenarios.ts';
import { signInScenarios } from './sign-in-scenarios.ts';
import { subagentScenarios } from './subagent-scenarios.ts';
import { terminalLogin } from './terminal-login.ts';
import { titleScenarios } from './title-scenarios.ts';

export const sharedReply = 'The shared fixture completed this Turn.';

export const imageReply = 'The dominant color is red.';

export const fileReply = 'The release notes list one change.';

const message = (text: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'agent_message_chunk',
    content: { type: 'text', text },
  },
});

const update = (value: SessionUpdate): ScriptedStep => ({
  type: 'update',
  update: value,
});

const reply = message(sharedReply);

const issueDetails: ScriptedStep = {
  type: 'elicitation',
  request: {
    mode: 'form',
    message: 'A few details for the new issue',
    requestedSchema: {
      type: 'object',
      properties: { title: { type: 'string', title: 'Title' } },
      required: ['title'],
    },
  },
};

const writePressureTools = 32;

const refusedReopen = 'The Agent refused to reopen the Session.';

// Every shared scenario opens its Sessions with the shared configuration.
const scenario = (steps: ScriptedStep[]): ScriptedScenario => ({
  configOptions: acpConfiguration,
  steps,
});

// Shared named scenarios; tests reuse them instead of scripting their own peer.
export const scenarios = {
  reply: scenario([reply]),
  'session-delegation': scenario(delegationSteps),
  ...cancellableScenarios(scenario, reply),
  ...notificationScenarios,
  ...shellScenarios,
  ...subagentScenarios,
  'changed-files': scenario(changedFilesSteps),
  'feed-history': scenario(feedHistorySteps),
  'feed-work': scenario(feedWorkReplySteps),
  'completed-tool-held-turn': scenario([...feedWorkSteps, { type: 'hold' }]),
  'feed-interrupted': scenario([...unfinishedFeedWorkSteps, { type: 'hold' }]),
  'terminal-login': { ...scenario([reply]), ...terminalLogin },
  image: scenario([message(imageReply)]),
  file: scenario([message(fileReply)]),
  'cancel-wait': scenario([{ type: 'wait-for-cancel' }]),
  'ignores-cancel': scenario([{ type: 'hold' }]),
  // Holds its first prompt through Stop until App E2E releases it, then replies to each next prompt.
  'held-until-released': {
    ...scenario([reply]),
    responses: {
      'session/prompt': [{ steps: [{ type: 'wait-for-release' }] }, {}],
    },
  },
  ...exitScenarios,
  ...signInScenarios([reply]),
  'exit-with-stderr': {
    ...scenario([agentExit]),
    resumedSteps: [reply],
  },
  'refuse-session': {
    ...scenario([reply]),
    responses: { 'session/new': [{ error: 'The Agent refused the Session.' }] },
  },
  // Refuses only the first reopen, so the Session opens again afterwards.
  'refuse-reopen': {
    ...scenario([reply]),
    responses: {
      'session/load': [{ error: refusedReopen }, {}],
      'session/resume': [{ error: refusedReopen }, {}],
    },
    relaunched: scenario([reply]),
  },
  ...permissionScenarios,
  elicitation: scenario([issueDetails, reply]),
  ...planModeScenarios(reply),
  ...contextUsageScenarios(reply),
  ...titleScenarios(reply, issueDetails),
  'held-mode': scenario(heldModeSteps),
  configuration: scenario([update(smallModelUpdate), reply]),
  'write-pressure': scenario([
    ...Array.from({ length: writePressureTools }, (_, index) => [
      update({
        sessionUpdate: 'tool_call',
        toolCallId: `read-${index}`,
        title: `Read file ${index}`,
        kind: 'read',
        status: 'in_progress',
      }),
      update({
        sessionUpdate: 'tool_call_update',
        toolCallId: `read-${index}`,
        status: 'completed',
      }),
    ]).flat(),
    reply,
  ]),
} satisfies Record<string, ScriptedScenario>;

export type ScenarioName = keyof typeof scenarios;

export const isScenarioName = (value: unknown): value is ScenarioName =>
  typeof value === 'string' && Object.hasOwn(scenarios, value);
