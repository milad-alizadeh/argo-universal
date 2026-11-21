import type { ProjectSchedule } from '@repo/contracts/operations';
import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { ScrollView } from '@repo/kit/primitives/layout/scroll-view';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type { ReactElement } from 'react';
import { View } from 'react-native';
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
    <Screen
      title={schedule.name}
      footer={<RunNow running={running} onRunNow={onRunNow} />}
    >
      <ScrollView>
        <View className="gap-2">
          <Text>{schedule.instructions}</Text>
          <View className="-mx-4">
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
          </View>
          {error && (
            <Text accessibilityRole="alert" tone="danger">
              {error}
            </Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function RunNow({
  running,
  onRunNow,
}: Pick<ScheduleDetailViewProps, 'running' | 'onRunNow'>): ReactElement {
  return (
    <Button
      label="Run now"
      icon="play"
      loading={running}
      disabled={running}
      onPress={onRunNow}
    />
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
