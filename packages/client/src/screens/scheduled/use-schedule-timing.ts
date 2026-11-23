import { ProjectScheduleCadence } from '@repo/contracts/operations';
import { useState } from 'react';
import { useProjectSchedulePreview } from '#features/project-schedules';
import { occurrenceTime, scheduleTimeZone } from '#features/project-schedules';
import { cadenceOf, scheduleCadenceDraft } from './schedule-cadence-draft';
import type { ScheduleCadenceFields } from './schedule-cadence-fields';

export function useScheduleTiming(
  projectId: string,
  initial?: ProjectScheduleCadence,
  id?: string,
): ScheduleCadenceFields {
  const [draft, onChange] = useState(() => scheduleCadenceDraft(initial));
  const cadence = ProjectScheduleCadence.safeParse(cadenceOf(draft));

  const input =
    projectId && cadence.success
      ? { id, projectId, cadence: cadence.data }
      : undefined;

  const preview = useProjectSchedulePreview(input);

  const nextRun =
    cadence.success && preview.data
      ? occurrenceTime(preview.data.nextAt, scheduleTimeZone(cadence.data))
      : undefined;

  return { draft, onChange, nextRun, previewError: preview.error?.message };
}
