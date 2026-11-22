import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { TintedAvatar } from '@repo/kit/tinted-avatar';
import { View } from 'react-native';
import type { ScheduleControls } from '../hooks/use-schedules';
import { FollowUpEditor } from './schedule-form';

type Schedules = ScheduleControls;

type Schedule = Schedules['items'][number];

export const scheduleTitle = (schedule: Schedule): string =>
  schedule.prompt.find((block) => block.type === 'text')?.text ??
  'Scheduled Prompt';

const minute = 60;

function scheduleInterval(seconds: number | null): string {
  if (seconds === null) return 'Once';

  return seconds % minute === 0
    ? `Every ${seconds / minute} min`
    : `Every ${seconds} s`;
}

// The Workbench card previews this many Follow-ups; the rest wait in the full list.
export const schedulePreviewLimit = 2;

// A previewed Follow-up's line under its prompt: its cadence while active, else where it stands.
export const schedulePreviewValue = (item: Schedule): string =>
  item.state === 'active'
    ? scheduleInterval(item.intervalSeconds)
    : timing(item);

function previewRow(item: Schedule): React.JSX.Element {
  const label = schedulePreviewValue(item);

  return (
    <View key={item.id} className="flex-row items-center gap-2 px-1 py-2">
      <TintedAvatar
        accessibilityLabel="Follow-up"
        icon={item.state === 'paused' ? 'pause' : 'clock'}
        tone="neutral"
      />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1}>{scheduleTitle(item)}</Text>
        <Text role="secondary" tone="muted" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export function SchedulePreview({
  schedules,
}: {
  schedules?: Schedules;
}): React.JSX.Element {
  return (
    <View>
      {schedules?.items.slice(0, schedulePreviewLimit).map(previewRow)}
    </View>
  );
}

const time = (stamp: number): string =>
  new Date(stamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

type RowProps = { item: Schedule; controls: Schedules };

function timing(item: Schedule): string {
  switch (item.state) {
    case 'completed':
      return 'Completed';
    case 'expired':
      return 'Expired';
    case 'paused':
      return 'Paused';
    case 'active':
      return item.endsAt !== null && item.nextAt >= item.endsAt
        ? 'No remaining occurrence'
        : 'Next ' + time(item.nextAt);
  }
}

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
  const action = item.state === 'paused' ? 'resume' : 'pause';
  const canToggle = item.state === 'active' || item.state === 'paused';

  const button = actionButton(item, controls);

  return (
    <View className="flex-row flex-wrap justify-end gap-1">
      {item.intervalSeconds === null ? null : (
        <FollowUpEditor controls={controls} item={item} />
      )}
      {canToggle ? button(item.paused ? 'Resume' : 'Pause', action) : null}
      {button('Delete', 'delete')}
    </View>
  );
}

function description(item: Schedule): string {
  const cadence = scheduleInterval(item.intervalSeconds) + ' · ' + timing(item);
  const end = item.endsAt === null ? last(item) : 'Ends ' + time(item.endsAt);

  return cadence + '\n' + end;
}

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
        {schedules?.canCreate ? <FollowUpEditor controls={schedules} /> : null}
        {schedules?.items.map((item) => (
          <ScheduleEntry key={item.id} item={item} controls={schedules} />
        ))}
      </ListSection>
    </List>
  );
}
