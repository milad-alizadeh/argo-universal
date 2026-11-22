import {
  sessionBarGroups,
  type SessionBarEntry,
  type SessionBarProps,
  workbenchPreviewLimit,
} from '#features/sessions';
import {
  type Visit,
  type WorkbenchGroup,
  type WorkbenchRow,
  WorkbenchRowList,
} from './session-workbench-sheet-rows';

const issueStateSeparator = ' · ';

function barRow(
  entry: SessionBarEntry,
  onOpen: SessionBarProps['onOpen'],
): WorkbenchRow {
  const statusAt = entry.text.indexOf(issueStateSeparator);
  const hasIssueState = entry.pluginId === 'issue-tracker' && statusAt > 0;

  return {
    key: JSON.stringify([entry.pluginId, entry.path, entry.text]),
    label: hasIssueState ? entry.text.slice(0, statusAt) : entry.text,
    leading: entry.icon,
    status: hasIssueState
      ? {
          label: entry.text.slice(statusAt + issueStateSeparator.length),
          tone: entry.tone ?? 'muted',
        }
      : undefined,
    navigate: entry.path === undefined ? undefined : () => onOpen(entry),
  };
}

function barGroup(
  [first, ...rest]: ReturnType<typeof sessionBarGroups>[number],
  onOpen: SessionBarProps['onOpen'],
  onVisit: Visit,
): WorkbenchGroup {
  const key = `bar:${first.pluginId}`;
  const title = first.pluginName;
  const rows = [first, ...rest].map((entry) => barRow(entry, onOpen));
  const more = rows.length - workbenchPreviewLimit;

  if (more <= 0) return { key, title, rows };

  return {
    key,
    title,
    rows: [
      ...rows.slice(0, workbenchPreviewLimit),
      {
        key: `${key}:all`,
        label: `${more} more`,
        page: {
          title,
          children: (
            <WorkbenchRowList label={title} rows={rows} onVisit={onVisit} />
          ),
        },
      },
    ],
  };
}

export function workbenchBarGroups(
  bar: SessionBarProps | undefined,
  onVisit: Visit,
): WorkbenchGroup[] {
  return bar
    ? sessionBarGroups(bar).map((lines) => barGroup(lines, bar.onOpen, onVisit))
    : [];
}
