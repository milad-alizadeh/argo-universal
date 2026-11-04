import type { Json } from '@repo/contracts/plugins/hook-protocol';
import {
  PluginOperationContribution,
  type PluginOperationCaller,
} from '@repo/contracts/plugins/plugin-operations';
import { expect, it } from 'vitest';
import { checkRun } from './checked-run';

const operation = PluginOperationContribution.parse({
  name: 'attach',
  label: 'Attach Issue to Session',
  description: 'Connect the calling Session to an Issue.',
  tier: 'act',
  params: {
    number: {
      type: 'number',
      description: 'The Issue number.',
      required: true,
    },
    status: {
      type: 'string',
      description: 'open or closed.',
      choices: ['open', 'closed'],
    },
  },
  caller: ['project', 'session'],
});

const caller = { sessionId: 'session-1', projectId: 'project-1' };

it('passes on the declared params, leaving out the ones not given', () => {
  expect(checkRun(operation, { number: 1320 }, caller)).toEqual({
    params: { number: 1320 },
    caller,
    outside: false,
  });
});

it('acts in the Project the run names, and says a Session reaching past its own Project must be confirmed', () => {
  expect(
    checkRun(operation, { number: 7, projectId: 'project-2' }, caller),
  ).toEqual({
    params: { number: 7 },
    caller: { sessionId: 'session-1', projectId: 'project-2' },
    outside: true,
  });
});

it('needs no confirmation for the Session’s own Project, or from a person', () => {
  const own = { number: 7, projectId: 'project-1' };

  expect(checkRun(operation, own, caller).outside).toBe(false);
  expect(
    checkRun(
      { ...operation, caller: ['project'] },
      { number: 7, projectId: 'project-2' },
      { person: true },
    ).outside,
  ).toBe(false);
});

type Refusal = {
  given: Json;
  from?: PluginOperationCaller;
  message: string;
};

const refusals = {
  'a param the Plugin never declared': {
    given: { number: 1, other: 2 },
    message: 'Unknown param other',
  },
  'a missing required param': {
    given: { status: 'open' },
    message: 'Param number is required',
  },
  'a param of the wrong type': {
    given: { number: '1320' },
    message: 'Param number must be a number',
  },
  'a value outside the param’s choices': {
    given: { number: 1, status: 'done' },
    message: 'Param status must be one of open, closed',
  },
  'params that are not an object': {
    given: [1],
    message: 'Params must be a JSON object',
  },
  'a run with no Session when one is needed': {
    given: { number: 1 },
    from: { projectId: 'project-1' },
    message: 'Only a Session can run attach',
  },
  'a run with no Project when one is needed': {
    given: { number: 1 },
    from: { sessionId: 'session-1' },
    message: 'attach needs a Project',
  },
} satisfies Record<string, Refusal>;

it.each(Object.entries<Refusal>(refusals))('refuses %s', (_name, refusal) => {
  expect(() =>
    checkRun(operation, refusal.given, refusal.from ?? caller),
  ).toThrow(refusal.message);
});

it('reads no params at all as none given', () => {
  expect(checkRun({ ...operation, params: {}, caller: [] }, null, {})).toEqual({
    params: {},
    caller: {},
    outside: false,
  });
});
