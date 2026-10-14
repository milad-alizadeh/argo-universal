import type { SessionUpdate } from '@agentclientprotocol/sdk';
import { acpConfiguration } from './acp-configuration.ts';
import { feedHistorySteps } from './feed-history-scenario.ts';
import {
  feedWorkSteps,
  unfinishedFeedWorkSteps,
} from './feed-work-scenario.ts';
import { protocolLogin, signedOutProtocolLogin } from './protocol-login.ts';
import { readinessScenarios } from './readiness-scenarios.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';
import { terminalLogin } from './terminal-login.ts';

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
const editReadme = { toolCallId: 'edit-readme', title: 'Edit README.md' };
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
  'feed-history': scenario(feedHistorySteps),
  'feed-work': scenario([
    ...feedWorkSteps,
    message('The greeting is updated.'),
  ]),
  'feed-interrupted': scenario([...unfinishedFeedWorkSteps, { type: 'hold' }]),
  'terminal-login': { ...scenario([reply]), ...terminalLogin },
  'protocol-login': { ...scenario([reply]), ...protocolLogin },
  'signed-out': { ...scenario([reply]), ...signedOutProtocolLogin },
  ...readinessScenarios(scenario([reply])),
  image: scenario([message(imageReply)]),
  file: scenario([message(fileReply)]),
  'cancel-wait': scenario([{ type: 'wait-for-cancel' }]),
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
  },
  permission: scenario([
    update({
      sessionUpdate: 'tool_call',
      ...editReadme,
      kind: 'edit',
      status: 'pending',
    }),
    {
      type: 'permission',
      request: {
        toolCall: editReadme,
        options: [
          { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
          { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
        ],
      },
    },
    update({
      sessionUpdate: 'tool_call_update',
      toolCallId: editReadme.toolCallId,
      status: 'completed',
    }),
    reply,
  ]),
  elicitation: scenario([
    {
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
    },
    reply,
  ]),
  configuration: scenario([
    update({
      sessionUpdate: 'config_option_update',
      configOptions: acpConfiguration.map((option) =>
        option.id === 'model' && option.type === 'select'
          ? { ...option, currentValue: 'small' }
          : option,
      ),
    }),
    reply,
  ]),
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
