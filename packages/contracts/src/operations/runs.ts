import {
  RunLogsParams,
  RunLogsResult,
  RunNameParams,
  RunStartParams,
  RunStartResult,
  RunStatusParams,
  RunStatusResult,
  RunStopResult,
} from '../runs/run';
import type { OperationDefinition } from './index';

const appWords = 'dev server';

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
} as const satisfies Record<string, OperationDefinition>;
