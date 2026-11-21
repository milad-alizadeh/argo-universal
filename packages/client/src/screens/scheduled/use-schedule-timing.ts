import { ProjectScheduleCadence } from '@repo/contracts/operations';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTRPC } from '#features/connection';
import { cadenceOf, scheduleCadenceDraft } from './schedule-cadence-draft';
import type { ScheduleCadenceFields } from './schedule-cadence-fields';
import { occurrenceTime, scheduleTimeZone } from './schedule-time';

export function useScheduleTiming(
  projectId: string,
  initial?: ProjectScheduleCadence,
): ScheduleCadenceFields {
  const trpc = useTRPC();
  const [draft, onChange] = useState(() => scheduleCadenceDraft(initial));
  const cadence = ProjectScheduleCadence.safeParse(cadenceOf(draft));

  const input =
    projectId && cadence.success
      ? { projectId, cadence: cadence.data }
      : skipToken;

  const preview = useQuery(trpc.project.schedulePreview.queryOptions(input));

  const nextRun =
    cadence.success && preview.data
      ? occurrenceTime(preview.data.nextAt, scheduleTimeZone(cadence.data))
      : undefined;

  return { draft, onChange, nextRun, previewError: preview.error?.message };
}
