import type { ProjectSchedule } from '@repo/contracts/operations';
import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type { ReactElement } from 'react';
import { intervalLabel, occurrenceTime } from './schedule-time';

export interface ScheduleDetailViewProps {
  schedule: ProjectSchedule;
  running?: boolean;
  error?: string;
  onRunNow: () => void;
}

export function ScheduleDetailView({
  schedule,
  running,
  error,
  onRunNow,
}: ScheduleDetailViewProps): ReactElement {
  return (
    <Screen title={schedule.name}>
      <Text>{schedule.instructions}</Text>
      <FieldGroup>
        <FieldGroup.Section>
          <FieldGroup.Value
            title="Cadence"
            value={intervalLabel(schedule.intervalSeconds)}
          />
          <FieldGroup.Value
            title="Next occurrence"
            value={occurrenceTime(schedule.nextAt)}
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
