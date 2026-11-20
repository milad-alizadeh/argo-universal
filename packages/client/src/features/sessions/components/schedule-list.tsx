import { Button } from '@repo/kit/primitives/actions/button';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { View } from 'react-native';
import type { ScheduleControls } from '../hooks/use-schedules';

type Schedules = ScheduleControls;

type Schedule = Schedules['items'][number];

export const scheduleTitle = (schedule: Schedule): string =>
  schedule.prompt.find((block) => block.type === 'text')?.text ??
  'Scheduled Prompt';

const minute = 60;

export const scheduleInterval = (seconds: number): string =>
  seconds % minute === 0
    ? `Every ${seconds / minute} min`
    : `Every ${seconds} s`;

const time = (stamp: number): string =>
  new Date(stamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

type RowProps = { item: Schedule; controls: Schedules };

const timing = (item: Schedule): string =>
  item.paused ? 'Paused' : 'Next at ' + time(item.nextAt);

const last = (item: Schedule): string =>
  item.lastQueuedAt === null
    ? 'Never queued'
    : 'Last queued at ' + time(item.lastQueuedAt);

const actionButton =
  (item: Schedule, controls: Schedules) =>
  (
    label: string,
    change: Parameters<Schedules['manage']>[1],
  ): React.JSX.Element => (
    <Button
      label={label}
      variant="secondary"
      size="xs"
      disabled={controls.disabled}
      onPress={() => controls.manage(item.id, change)}
    />
  );

function ScheduleActions({ item, controls }: RowProps): React.JSX.Element {
  const action = item.paused ? 'resume' : 'pause';

  const button = actionButton(item, controls);

  return (
    <View className="flex-row gap-2">
      {button(item.paused ? 'Resume' : 'Pause', action)}
      {button('Delete', 'delete')}
    </View>
  );
}

const description = (item: Schedule): string =>
  scheduleInterval(item.intervalSeconds) +
  ' · ' +
  timing(item) +
  '\n' +
  last(item);

function ScheduleEntry(props: RowProps): React.JSX.Element {
  const { item } = props;

  return (
    <ListItem
      title={scheduleTitle(item)}
      subtitle={description(item)}
      subtitleLines={2}
      multiline
      control={<ScheduleActions {...props} />}
    />
  );
}

export function ScheduleList({
  schedules,
}: {
  schedules?: Schedules;
}): React.JSX.Element {
  return (
    <List>
      <ListSection>
        {schedules?.items.map((item) => (
          <ScheduleEntry key={item.id} item={item} controls={schedules} />
        ))}
      </ListSection>
    </List>
  );
}
