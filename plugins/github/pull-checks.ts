import { isObject, type Json } from './json';

// One Check of a commit as the Plugin keeps it; JSON all through, so a Query can hold it.
export type CheckInfo = {
  name: string;
  state: 'running' | 'passed' | 'failed';
};

const invalid = 'GitHub returned invalid Checks.';

// GitHub reads at most this many Checks of a commit in one call.
export const checksPageSize = 100;

// A conclusion that did not block the commit; anything else, a timeout or a cancel included, did.
const passing: ReadonlySet<Json | undefined> = new Set([
  'success',
  'neutral',
  'skipped',
]);

// Anything GitHub has not finished is still running, so a Check that has not reported never reads as passed.
function stateOf(run: { [key: string]: Json }): CheckInfo['state'] {
  if (run.status !== 'completed') return 'running';

  return passing.has(run.conclusion) ? 'passed' : 'failed';
}

const nameOf = ({ name }: { [key: string]: Json }): string => {
  if (typeof name === 'string' && name !== '') return name;

  throw new Error(invalid);
};

function checkOf(run: Json): CheckInfo {
  if (!isObject(run)) throw new Error(invalid);

  return { name: nameOf(run), state: stateOf(run) };
}

const runsOf = (reply: Json): Json[] => {
  if (isObject(reply) && Array.isArray(reply.check_runs))
    return reply.check_runs;

  throw new Error(invalid);
};

const totalOf = (reply: Json): number =>
  isObject(reply) && typeof reply.total_count === 'number'
    ? reply.total_count
    : 0;

// A list that is shorter than GitHub's own count may leave out a failing Check, so it is refused.
function refuseTruncated(reply: Json, runs: readonly Json[]): void {
  const total = totalOf(reply);

  if (total > runs.length)
    throw new Error(
      `${total} Checks is more than Argo reads for one commit (${checksPageSize}).`,
    );
}

// The individual Checks out of GitHub's reply.
export function parseChecks(body: string): CheckInfo[] {
  const reply: Json = JSON.parse(body);
  const runs = runsOf(reply);

  refuseTruncated(reply, runs);

  return runs.map(checkOf);
}
