import type { Plan } from './plan';
import type { PlanUpdate, SessionUpdate } from './session-update';

export const readPlanContentRevision = (planRow: PlanUpdate): number =>
  planRow._meta?.argo?.contentRevision ?? planRow.revision;
const selectLaterPlanContent = (
  selectedPlanRow: PlanUpdate | undefined,
  candidatePlanRow: PlanUpdate,
): PlanUpdate =>
  !selectedPlanRow ||
  readPlanContentRevision(candidatePlanRow) >
    readPlanContentRevision(selectedPlanRow)
    ? candidatePlanRow
    : selectedPlanRow;
export const selectPlanRowWithLatestContent = (
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
  const latest = selectPlanRowWithLatestContent(rows);
  return latest?._meta?.argo?.removed ? null : (latest?.plan ?? null);
};
