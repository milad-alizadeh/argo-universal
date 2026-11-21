import type { ProjectSchedule } from '@repo/contracts/operations';
import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type { ReactElement } from 'react';
import {
  cadenceLabel,
  occurrenceTime,
  scheduleTimeZone,
} from '../schedule-time';

export interface ScheduleDetailViewProps {
  schedule?: ProjectSchedule;
  status?: 'loading' | 'failed';
  running?: boolean;
  error?: string;
  onRunNow: () => void;
}

export function ScheduleDetailView({
  schedule,
  status,
  running,
  error,
  onRunNow,
}: ScheduleDetailViewProps): ReactElement {
  if (!schedule) return <ScheduleUnavailable status={status} />;

  return (
    <Screen title={schedule.name}>
      <Text>{schedule.instructions}</Text>
      <FieldGroup>
        <FieldGroup.Section>
          <FieldGroup.Value
            title="Cadence"
            value={cadenceLabel(schedule.cadence)}
          />
          <FieldGroup.Value
            title="Next occurrence"
            value={
              schedule.paused
                ? 'Paused'
                : occurrenceTime(
                    schedule.nextAt,
                    scheduleTimeZone(schedule.cadence),
                  )
            }
          />
        </FieldGroup.Section>
      </FieldGroup>
      {error && (
        <Text accessibilityRole="alert" tone="danger">
          {error}
        </Text>
      )}
      <Button
        label="Run now"
        icon="play"
        loading={running}
        disabled={running}
        onPress={onRunNow}
      />
    </Screen>
  );
}

function ScheduleUnavailable({
  status,
}: Pick<ScheduleDetailViewProps, 'status'>): ReactElement {
  return (
    <Screen title="Schedule">
      <EmptyState title={unavailableTitle(status)} />
    </Screen>
  );
}

function unavailableTitle(status: ScheduleDetailViewProps['status']): string {
  if (status === 'loading') return 'Loading Schedule';

  if (status === 'failed') return 'Could not load Schedule';

  return 'Schedule not found';
}
