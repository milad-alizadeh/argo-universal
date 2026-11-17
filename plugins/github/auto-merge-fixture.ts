import { graphqlPath } from './github-fixture-automation';
import type { FixturePull } from './github-fixture-types';
import { attach, changesOf } from './journey-calls-fixture';
import {
  caller,
  journey,
  project,
  sessionId,
  type Caller,
  type Journey,
} from './journey-fixture';
import type { AutomationOffer, AutomationState } from './pull-automation';

export const slow = 30_000;

export const repository = 'owner/repository';

export const reference = `${repository}#12`;

type Offering = { automation?: AutomationOffer };

// The automation the Changes Slot offers for the Session's one pull request.
export async function automationOf(run: Journey): Promise<AutomationOffer> {
  const [change]: Offering[] = await changesOf(run);
  const automation = change?.automation;

  if (!automation) throw new Error('The Change offers no automation.');

  return automation;
}

export const mergeOf = async (run: Journey): Promise<AutomationState> =>
  (await automationOf(run)).merge;

export const set = (
  run: Journey,
  params: { reference?: string; kind: string; on: boolean },
  as: Caller = caller,
): ReturnType<Journey['test']['operations']['run']> =>
  run.test.operations.run({
    name: 'automationSet',
    params: { reference, ...params },
    caller: as,
    // An Agent's call asks the person first; this one says yes.
    confirm: () => Promise.resolve(),
  });

// A person's tap in the App: a person in the Project, naming the Session.
export const tap = (
  run: Journey,
  params: { kind: string; on: boolean },
): ReturnType<Journey['test']['operations']['run']> =>
  run.test.operations.run({
    name: 'automationSet',
    params: { reference, sessionId, ...params },
    caller: { projectId: project.id, person: true },
  });

export async function refresh(run: Journey): Promise<void> {
  await run.test.operations.run({ name: 'refresh', caller });
}

export async function attached(): Promise<Journey> {
  const run = await journey();

  await attach(run, reference);

  return run;
}

export function pullOf12(run: Journey): FixturePull {
  const pull = run.github.pulls.get(reference);

  if (!pull) throw new Error('The fixture has no pull request 12');

  return pull;
}

// What GitHub's GraphQL endpoint was asked, in order: each call a write when it is a mutation, otherwise a read.
export const graphqlOrder = (run: Journey): ('write' | 'read')[] =>
  run.github.requests
    .filter(({ path }) => path === graphqlPath)
    .map(({ body }) => {
      const { query }: { query: string } = JSON.parse(body);

      return query.includes('mutation') ? 'write' : 'read';
    });
