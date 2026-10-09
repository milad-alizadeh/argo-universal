import type { Plan } from './plan';
import type { PlanUpdate, SessionUpdate } from './session-update';

export const planContentRevision = (row: PlanUpdate): number =>
  row._meta?.argo?.contentRevision ?? row.revision;
const selectLaterPlanContent = (
  first: PlanUpdate | undefined,
  second: PlanUpdate,
): PlanUpdate =>
  !first || planContentRevision(second) > planContentRevision(first)
    ? second
    : first;
export const selectLatestPlanRow = (
  rows: Iterable<SessionUpdate>,
): PlanUpdate | undefined => {
  let latest: PlanUpdate | undefined;
  for (const row of rows)
    if (row.sessionUpdate === 'plan_update')
      latest = selectLaterPlanContent(latest, row);
  return latest;
};
export const selectActivePlan = (
  rows: Iterable<SessionUpdate>,
): Plan | null => {
  const latest = selectLatestPlanRow(rows);
  return latest?._meta?.argo?.removed ? null : (latest?.plan ?? null);
};
