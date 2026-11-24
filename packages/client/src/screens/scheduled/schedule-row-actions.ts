import type { ProjectSchedule } from '@repo/contracts/operations';
import type { MenuAction } from '@repo/kit/primitives/overlays/menu';
import {
  cadenceLabel,
  upcomingOccurrence,
  scheduleTimeZone,
} from '#features/project-schedules';
import type { ScheduleRowAction } from './scheduled-list-view';

export function scheduleSubtitle(schedule: ProjectSchedule): string {
  const cadence = cadenceLabel(schedule.cadence);

  if (schedule.archived) return `${cadence} · Archived`;

  if (schedule.paused) return cadence;

  if (schedule.running) return `${cadence} · Running`;

  const time = upcomingOccurrence(
    schedule.nextAt,
    scheduleTimeZone(schedule.cadence),
  );

  return `${cadence} · ${time}`;
}

export type ScheduleMenuProps = {
  schedule: ProjectSchedule;
  onAction: (schedule: ProjectSchedule, action: ScheduleRowAction) => void;
};

export function menuEntries({
  schedule,
  onAction,
}: ScheduleMenuProps): MenuAction[] {
  const entries: MenuAction[] = [];

  if (!schedule.archived) {
    entries.push(
      {
        label: schedule.paused ? 'Resume' : 'Pause',
        onPress: () => onAction(schedule, schedule.paused ? 'resume' : 'pause'),
      },
      {
        label: 'Run now',
        disabled: schedule.running,
        onPress: () => onAction(schedule, 'run'),
      },
    );
  }

  entries.push(
    {
      label: 'Edit Schedule',
      icon: 'edit',
      onPress: () => onAction(schedule, 'edit'),
    },
    {
      label: 'Delete Schedule…',
      icon: 'delete',
      tone: 'danger',
      section: {},
      onPress: () => onAction(schedule, 'delete'),
    },
  );

  return entries;
}
