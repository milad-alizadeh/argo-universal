// One Check of a commit as the Plugin keeps it; JSON all through, so a Query can hold it.
export type CheckInfo = {
  name: string;
  state: 'running' | 'passed' | 'failed';
};

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const invalid = 'GitHub returned invalid Checks.';

// GitHub reads at most this many Checks of a commit in one call.
export const checksPageSize = 100;

const isObject = (value: Json | undefined): value is { [key: string]: Json } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

function checkOf(run: Json): CheckInfo {
  if (!isObject(run)) throw new Error(invalid);

  const { name } = run;

  if (typeof name !== 'string' || name === '') throw new Error(invalid);

  return { name, state: stateOf(run) };
}

/*
 * The individual Checks out of GitHub's reply. More Checks than one read returns is refused: a list that may leave out
 * a failing Check must not pass for the whole.
 */
export function parseChecks(body: string): CheckInfo[] {
  const reply: Json = JSON.parse(body);

  if (!isObject(reply) || !Array.isArray(reply.check_runs))
    throw new Error(invalid);

  const total = reply.total_count;

  if (typeof total === 'number' && total > reply.check_runs.length)
    throw new Error(
      `${total} Checks is more than Argo reads for one commit (${checksPageSize}).`,
    );

  return reply.check_runs.map(checkOf);
}
