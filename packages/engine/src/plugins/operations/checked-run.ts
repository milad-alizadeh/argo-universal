import type { Json } from '@repo/contracts/plugins/hook-protocol';
import {
  projectParam,
  type PluginOperationCaller,
  type PluginOperationContribution,
  type PluginOperationNeed,
  type PluginOperationParam,
} from '@repo/contracts/plugins/plugin-operations';
import { z } from 'zod';

// The params one Operation declares, by name.
type Params = NonNullable<PluginOperationContribution['params']>;

const projectIdParam: PluginOperationParam = {
  type: 'string',
  description: "The Project to act in; the caller's own Project by default.",
};

// The params a run may name: the declared ones, and `projectId` for an Operation that needs a Project.
const projectParams = (operation: PluginOperationContribution): Params =>
  operation.caller?.includes('project')
    ? { [projectParam]: projectIdParam }
    : {};

export const runParams = (operation: PluginOperationContribution): Params =>
  ({
    ...operation.params,
    ...projectParams(operation),
  }) satisfies Params;

type ParamValue = string | number | boolean;

type CheckedParams = Readonly<Record<string, ParamValue>>;

/*
 * What the handler is handed: the checked params, and the Caller with the Project it acts in. `outside` says a
 * Session names a Project other than its own, which is `confirm` tier (ADR-0044) and so asks the user first.
 */
export type CheckedRun = {
  params: CheckedParams;
  caller: PluginOperationCaller;
  outside: boolean;
};

// Params arrive as JSON from the CLI or the App, so their shape is parsed before it is read.
const GivenParams = z.record(z.string(), z.json()).nullish();

const givenParams = (given: Json): Record<string, Json> => {
  const parsed = GivenParams.safeParse(given);

  if (!parsed.success) throw new Error('Params must be a JSON object');

  return parsed.data ?? {};
};

/*
 * What core passes a Plugin's handler: exactly the params it declared, each of the declared type and one
 * of its choices, with every required one given, so a Plugin never sees a param it did not ask for. An
 * Operation that needs a Session runs only for one; one that needs a Project acts in the `projectId` the
 * run names, or else the Caller's own Project, and runs only when there is one. A Session that names another
 * Project is `outside`; a person is never.
 */
export function checkRun(
  operation: PluginOperationContribution,
  given: Json,
  caller: PluginOperationCaller,
): CheckedRun {
  const { [projectParam]: named, ...params } = checkParams(
    runParams(operation),
    given,
  );

  return {
    params,
    caller: checkedCaller(operation, inProject(caller, named)),
    outside: namesOtherProject(caller, named),
  };
}

const namesOtherProject = (
  { sessionId, person, projectId }: PluginOperationCaller,
  named: ParamValue | undefined,
): boolean =>
  sessionId !== undefined &&
  person !== true &&
  typeof named === 'string' &&
  named !== projectId;

const inProject = (
  caller: PluginOperationCaller,
  named: ParamValue | undefined,
): PluginOperationCaller =>
  typeof named === 'string' ? { ...caller, projectId: named } : caller;

type Need = {
  lacks: (caller: PluginOperationCaller) => boolean;
  refusal: (name: string) => string;
};

// What each need refuses a run without.
const needed: Readonly<Record<PluginOperationNeed, Need>> = {
  session: {
    lacks: ({ sessionId, person }): boolean => !sessionId || person === true,
    refusal: (name): string => `Only a Session can run ${name}`,
  },
  project: {
    lacks: ({ projectId }): boolean => !projectId,
    refusal: (name): string => `${name} needs a Project: name it as projectId`,
  },
};

function checkedCaller(
  operation: PluginOperationContribution,
  caller: PluginOperationCaller,
): PluginOperationCaller {
  const lacking = operation.caller?.find((need) => needed[need].lacks(caller));

  if (lacking) throw new Error(needed[lacking].refusal(operation.name));

  return caller;
}

function checkParams(params: Params, given: Json): CheckedParams {
  const values = givenParams(given);

  for (const name of Object.keys(values))
    if (!Object.hasOwn(params, name)) throw new Error(`Unknown param ${name}`);

  return Object.fromEntries(
    Object.entries(params).flatMap(([name, param]) =>
      checkedParam(name, param, values[name]),
    ),
  );
}

function checkedParam(
  name: string,
  param: PluginOperationParam,
  value: Json | undefined,
): [string, ParamValue][] {
  if (value === undefined || value === null) return missingParam(name, param);

  return [[name, checkedValue(name, param, value)]];
}

const missingParam = (
  name: string,
  param: PluginOperationParam,
): [string, ParamValue][] => {
  if (param.required) throw new Error(`Param ${name} is required`);

  return [];
};

const paramSchemas = {
  string: z.string(),
  number: z.number(),
  boolean: z.boolean(),
} as const;

const checkedValue = (
  name: string,
  param: PluginOperationParam,
  value: Json,
): ParamValue => {
  const parsed = paramSchemas[param.type].safeParse(value);

  if (!parsed.success) throw new Error(`Param ${name} must be a ${param.type}`);

  return chosen(name, param, parsed.data);
};

// A param that lists its choices takes one of them and nothing else.
function chosen(
  name: string,
  { choices }: PluginOperationParam,
  value: ParamValue,
): ParamValue {
  if (choices && !choices.includes(String(value)))
    throw new Error(`Param ${name} must be one of ${choices.join(', ')}`);

  return value;
}
