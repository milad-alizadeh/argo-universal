import {
  RunDraftParams,
  RunDraftResult,
  RunGroupNameParams,
  RunGroupStartParams,
  RunGroupStartResult,
  RunGroupStopResult,
  RunLogsParams,
  RunLogsResult,
  RunNameParams,
  RunStartParams,
  RunStartResult,
  RunStatusParams,
  RunStatusResult,
  RunStopResult,
} from '../runs/run';
import {
  RunSettingsList,
  RunSettingsProject,
  RunSettingsResult,
  RunSettingsUpdate,
} from '../runs/settings';
import type { OperationDefinition } from './index';

const appWords = 'dev server';

const runSettingsMetadata = {
  icon: 'settings',
  policy: 'person-only',
  keywords: ['environment', 'port', 'auto-start'],
} as const;

export const runOperations = {
  'run.start': {
    id: 'run.start',
    label: 'Start Run',
    icon: 'terminal',
    description:
      'Start a Run Configuration from .argo/run.json and wait until it is ready. Returns its URL and port, or the end of its output if it is not ready in time.',
    params: RunStartParams,
    result: RunStartResult,
    tier: 'act',
    policy: 'allow',
    keywords: [appWords, 'app', 'launch', 'port', 'serve'],
  },
  'run.stop': {
    id: 'run.stop',
    label: 'Stop Run',
    icon: 'close',
    description: 'Stop a Run and everything it started.',
    params: RunNameParams,
    result: RunStopResult,
    tier: 'act',
    policy: 'allow',
    keywords: [appWords, 'kill', 'app', 'port'],
  },
  'run.restart': {
    id: 'run.restart',
    label: 'Restart Run',
    icon: 'retry',
    description:
      'Stop a Run and start it again, then wait until it is ready. Returns what run.start returns.',
    params: RunStartParams,
    result: RunStartResult,
    tier: 'act',
    policy: 'allow',
    keywords: [appWords, 'reload', 'app', 'port'],
  },
  'run.startGroup': {
    id: 'run.startGroup',
    label: 'Start Run Configuration group',
    icon: 'play',
    description:
      'Start every member of a Run Configuration group from .argo/run.json.',
    params: RunGroupStartParams,
    result: RunGroupStartResult,
    tier: 'act',
    policy: 'allow',
    keywords: ['start', 'stack', 'group'],
  },
  'run.stopGroup': {
    id: 'run.stopGroup',
    label: 'Stop Run Configuration group',
    icon: 'stop',
    description: 'Stop the Runs of every member of a Run Configuration group.',
    params: RunGroupNameParams,
    result: RunGroupStopResult,
    tier: 'act',
    policy: 'allow',
    keywords: ['stop', 'stack', 'group'],
  },
  'run.getSettings': {
    id: 'run.getSettings',
    label: 'Get Run settings',
    ...runSettingsMetadata,
    description: 'Read the personal Project overrides for a Run Configuration.',
    params: RunNameParams,
    result: RunSettingsResult,
    tier: 'read',
  },
  'run.listSettings': {
    id: 'run.listSettings',
    label: 'List Project Run settings',
    ...runSettingsMetadata,
    description:
      'Read personal settings for Run Configurations in the Project’s main Checkout.',
    params: RunSettingsProject,
    result: RunSettingsList,
    tier: 'read',
  },
  'run.updateSettings': {
    id: 'run.updateSettings',
    label: 'Update Run settings',
    ...runSettingsMetadata,
    description:
      'Change the personal environment, port, or auto-start settings for a Run Configuration.',
    params: RunSettingsUpdate,
    result: RunSettingsResult,
    tier: 'act',
  },
  'run.status': {
    id: 'run.status',
    label: 'List Runs',
    icon: 'terminal',
    description:
      'List the Checkout’s Run Configurations and the state of each Run: stopped, starting, ready, crashed or lost.',
    params: RunStatusParams,
    result: RunStatusResult,
    tier: 'read',
    policy: 'allow',
    keywords: [appWords, 'configurations', 'running', 'port'],
  },
  'run.logs': {
    id: 'run.logs',
    label: 'Read Run output',
    icon: 'terminal',
    description: 'Read the end of a Run’s output, even after it crashed.',
    params: RunLogsParams,
    result: RunLogsResult,
    tier: 'read',
    policy: 'allow',
    keywords: [appWords, 'errors', 'output', 'crash'],
  },
  'run.draft': {
    id: 'run.draft',
    label: 'Draft Run Configurations',
    icon: 'terminal',
    description:
      'Write a first .argo/run.json from package.json scripts, a Procfile, .vscode/launch.json and .claude/launch.json. It never runs them, and refuses to replace an existing file unless overwrite is true.',
    params: RunDraftParams,
    result: RunDraftResult,
    tier: 'act',
    policy: 'allow',
    keywords: ['draft', 'import', 'package.json', 'procfile', 'launch.json'],
  },
} as const satisfies Record<string, OperationDefinition>;
