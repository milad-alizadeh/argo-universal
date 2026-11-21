import type { ProjectScheduleHistoryEntry } from '@repo/contracts/operations';
import { Button } from '@repo/kit/primitives/actions/button';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import {
  DialogCancel,
  DialogFooter,
  DialogForm,
} from '@repo/kit/primitives/overlays/dialog';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type { ReactElement } from 'react';
import { occurrenceTime } from './schedule-time';

export interface ScheduleHistoryViewProps {
  entries: readonly ProjectScheduleHistoryEntry[];
  loading?: boolean;
  error?: string;
  onOpenSession: (sessionId: string) => void;
  onLoadMore?: () => void;
}

export function ScheduleHistoryView(
  props: ScheduleHistoryViewProps,
): ReactElement {
  return (
    <DialogForm
      title="History"
      footer={
        <DialogFooter>
          <DialogCancel label="Done" />
        </DialogFooter>
      }
    >
      {props.entries.length ? (
        <List appearance="plain" padding={0} fit>
          {props.entries.map((entry) => (
            <OccurrenceRow
              key={entry.id}
              entry={entry}
              onOpenSession={props.onOpenSession}
            />
          ))}
        </List>
      ) : (
        <EmptyState title={historyStatus(props)} description={props.error} />
      )}
      {props.onLoadMore && (
        <Button
          label="Load more"
          variant="secondary"
          loading={props.loading}
          onPress={props.onLoadMore}
        />
      )}
    </DialogForm>
  );
}

function historyStatus(props: ScheduleHistoryViewProps): string {
  if (props.loading) return 'Loading history';

  if (props.error) return 'Could not load history';

  return 'No occurrences yet';
}

function OccurrenceRow({
  entry: { occurrence },
  onOpenSession,
}: {
  entry: ProjectScheduleHistoryEntry;
  onOpenSession: ScheduleHistoryViewProps['onOpenSession'];
}): ReactElement {
  const time = occurrenceTime(occurrence.at);

  if (occurrence.outcome === 'started') {
    return (
      <ListItem
        title="Session started"
        subtitle={time}
        onPress={() => onOpenSession(occurrence.sessionId)}
      />
    );
  }

  return (
    <ListItem
      title={occurrence.outcome === 'failed' ? 'Failed' : 'Skipped'}
      subtitle={`${time} · ${occurrence.reason}`}
      subtitleLines={2}
      multiline
    />
  );
}
