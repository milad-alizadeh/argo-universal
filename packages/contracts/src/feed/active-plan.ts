import type { Plan } from './plan';
import type { PlanUpdate, SessionUpdate } from './session-update';

const planMeta = (
  planRow: PlanUpdate,
): NonNullable<PlanUpdate['_meta']>['argo'] => planRow._meta?.argo;

export const readPlanContentRevision = (planRow: PlanUpdate): number =>
  planMeta(planRow)?.contentRevision ?? planRow.revision;

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

  return latest ? activeContent(latest) : null;
};

function activeContent(row: PlanUpdate): Plan | null {
  return planMeta(row)?.removed ? null : row.plan;
}
