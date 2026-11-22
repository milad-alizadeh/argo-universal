import type { RunConfigurationRow, ShellTerminal } from '@repo/contracts';
import {
  activePreview,
  backgroundTaskIsRunning,
  runGroupStatus,
  runStatusLabel,
  runStatusTone,
  ScheduleList,
  scheduleMark,
  schedulePreviewLimit,
  schedulePreviewValue,
  scheduleTitle,
  type SessionRuns,
  showMoreLabel,
  subagentIsWorking,
  workbenchPreviewLimit,
} from '#features/sessions';
import { pluginSymbol } from '../../../lib/product/plugin-symbol';
import { agentsFacts } from './sections/agents-facts';
import { changesFacts } from './sections/changes-facts';
import type { PluginCardLine } from './sections/plugin-card-rows';
import {
  pluginCardKey,
  type SessionPluginCard,
} from './sections/plugin-card-section';
import { schedulesSection } from './sections/schedules-section';
import { shellsFacts } from './sections/shells-facts';
import type { SessionInspectorContent } from './session-inspector-content';
import { runTabKey, shellTabKey } from './session-terminal-tabs';
import {
  agentRow,
  changeRows,
  taskRow,
  type Tasks,
} from './session-workbench-details';
import { workbenchRunsKey } from './session-workbench-run-pages';
import {
  type Visit,
  type WorkbenchGroup,
  type WorkbenchRow,
  WorkbenchRowList,
} from './session-workbench-sheet-rows';
import { workbenchShellPage } from './session-workbench-shell-page';

// A Plugin card's page read as lines; none while the card holds no tree.
export type CardLines = (card: SessionPluginCard) => readonly PluginCardLine[];

interface Building {
  cardLines: CardLines;
  onVisit: Visit;
}

/*
 * A phone's Workbench: one titled section per card the Workbench column draws, in its order, each holding the
 * card's content as native rows (ADR-0042). A card that previews its live items and counts the rest does the same
 * here, and the count opens the full list, so no section grows without bound.
 */
export function workbenchGroups(
  content: SessionInspectorContent,
  { cardLines, onVisit }: Building,
): WorkbenchGroup[] {
  const groups: WorkbenchGroup[] = [
    { ...changesFacts, rows: changeRows(content, onVisit) },
    agentsGroup(content, onVisit),
    tasksGroup(content, onVisit),
    ...runsGroup(content.runs),
    ...followUpsGroup(content),
    ...(content.pluginCards ?? []).map((card) =>
      pluginGroup(card, cardLines(card)),
    ),
  ];

  return groups.filter(({ rows }) => rows.some((row) => !row.hidden));
}

interface Preview<Item> {
  key: string;
  title: string;
  items: readonly Item[];
  live: (item: Item) => boolean;
  row: (item: Item) => WorkbenchRow;
}

// The live items as rows, up to the card's limit, then one row naming the rest that opens every item.
function previewGroup<Item>(
  { key, title, items, live, row }: Preview<Item>,
  onVisit: Visit,
): WorkbenchGroup {
  const { rows: previewed, more, done } = activePreview(items, live);

  // The full list draws every row; the section only the previewed ones.
  const rows = items.map((item) => ({
    ...row(item),
    hidden: !previewed.includes(item),
  }));

  if (more + done === 0) return { key, title, rows };

  const everything = {
    key: `${key}:all`,
    label: showMoreLabel({ more, done }),
    page: {
      title,
      children: (
        <WorkbenchRowList label={title} rows={rows} onVisit={onVisit} />
      ),
    },
  };

  return { key, title, rows: [...rows, everything] };
}

const agentsGroup = (
  content: SessionInspectorContent,
  onVisit: Visit,
): WorkbenchGroup =>
  previewGroup(
    {
      key: agentsFacts.key,
      title: agentsFacts.title,
      items: content.subagents?.subagents ?? [],
      live: subagentIsWorking,
      row: (agent) => agentRow(agent, content),
    },
    onVisit,
  );

const tasksPreview = (shells: Tasks): Preview<Tasks['shells'][number]> => ({
  key: shellsFacts.key,
  title: shellsFacts.title,
  items: shells.shells,
  live: backgroundTaskIsRunning,
  row: (shell) => taskRow(shell, shells),
});

const tasksGroup = (
  { shells }: SessionInspectorContent,
  onVisit: Visit,
): WorkbenchGroup =>
  shells
    ? previewGroup(tasksPreview(shells), onVisit)
    : { key: shellsFacts.key, title: shellsFacts.title, rows: [] };

// A named Run opens its Terminal page.
const runRow = (run: RunConfigurationRow): WorkbenchRow => ({
  key: runTabKey(run.name),
  label: run.name,
  status: {
    label: runStatusLabel(run, 0, false),
    tone: runStatusTone[run.status],
  },
  value: run.port === null ? undefined : `:${run.port}`,
  opens: runTabKey(run.name),
});

// A Terminal the person opened opens its own page.
const terminalRow = (shell: ShellTerminal): WorkbenchRow => ({
  key: shellTabKey(shell.id),
  label: shell.name,
  leading: 'terminal',
  value: shell.cwd,
  opens: workbenchShellPage(shell),
});

function defaultGroupRow({ defaultGroup, runs }: SessionRuns): WorkbenchRow[] {
  if (!defaultGroup?.status.members.length) return [];

  const { name, readyCount, members } = defaultGroup.status;

  return [
    {
      key: 'run-group',
      label: name,
      status: {
        label: `${readyCount} of ${members.length} ready`,
        tone: runStatusTone[runGroupStatus(defaultGroup.status, runs)],
      },
      opens: workbenchRunsKey,
    },
  ];
}

const manageRuns: WorkbenchRow = {
  key: workbenchRunsKey,
  label: 'Manage Runs',
  opens: workbenchRunsKey,
};

/*
 * The Runs card: the default group, each named Run and each open Terminal, then the page that starts and stops them
 * and opens a new Terminal, which the column's card does with its buttons.
 */
function runsGroup(runs: SessionRuns | undefined): WorkbenchGroup[] {
  if (!runs || (!runs.runs.length && !runs.shells?.length && !runs.openShell))
    return [];

  const rows = [
    ...defaultGroupRow(runs),
    ...runs.runs.map(runRow),
    ...(runs.shells ?? []).map(terminalRow),
    manageRuns,
  ];

  return [{ key: workbenchRunsKey, title: 'Runs', rows }];
}

type Schedules = NonNullable<SessionInspectorContent['schedules']>;

const followUpsKey = schedulesSection.key;

// The Follow-ups list, which manages and adds them; every row of the section opens it.
const followUpsList = (schedules: Schedules): WorkbenchRow => ({
  key: followUpsKey,
  label: schedulesSection.title,
  hidden: true,
  page: {
    title: schedulesSection.title,
    children: <ScheduleList schedules={schedules} />,
  },
});

const followUpRow =
  (list: WorkbenchRow) =>
  (item: Schedules['items'][number]): WorkbenchRow => ({
    key: `${followUpsKey}:${item.id}`,
    label: scheduleTitle(item),
    leadingMark: scheduleMark(item),
    value: item.state === 'active' ? schedulePreviewValue(item) : undefined,
    status:
      item.state === 'active'
        ? undefined
        : {
            label: schedulePreviewValue(item),
            tone: followUpTone[item.state],
          },
    visits: list,
  });

const followUpTone = {
  paused: 'warning',
  completed: 'done',
  expired: 'muted',
} as const;

// The row naming how many of a section's items wait behind the page it opens.
const moreRow = (
  key: string,
  more: number,
  visits: WorkbenchRow,
): WorkbenchRow => ({ key: `${key}:more`, label: `${more} more`, visits });

const addFollowUpRow = (visits: WorkbenchRow): WorkbenchRow => ({
  key: `${followUpsKey}:add`,
  label: 'Add follow-up',
  visits,
});

// The Follow-ups card: the ones it previews, then a row for the rest and one to add another.
function followUpsGroup({
  schedules,
}: SessionInspectorContent): WorkbenchGroup[] {
  if (!schedules) return [];

  const list = followUpsList(schedules);
  const more = schedules.items.length - schedulePreviewLimit;
  const previewed = schedules.items.slice(0, schedulePreviewLimit);

  const rows = [
    list,
    ...previewed.map(followUpRow(list)),
    ...(more > 0 ? [moreRow(followUpsKey, more, list)] : []),
    ...(schedules.canCreate ? [addFollowUpRow(list)] : []),
  ];

  return [{ key: followUpsKey, title: schedulesSection.title, rows }];
}

const lineRow =
  (card: WorkbenchRow) =>
  ({ title, value }: PluginCardLine, at: number): WorkbenchRow => ({
    key: `${card.key}:line:${at}`,
    label: title,
    value,
    visits: card,
  });

/*
 * A Plugin's card: its page's lines as rows, each opening the card's full view, or the card itself when it has
 * none, as a press on the card in the column does. A page with no lines to read keeps one row that opens it.
 */
function pluginGroup(
  { pluginId, card, page, tab }: SessionPluginCard,
  lines: readonly PluginCardLine[],
): WorkbenchGroup {
  const key = pluginCardKey(pluginId, card.id);
  const more = lines.length - workbenchPreviewLimit;

  const open: WorkbenchRow = {
    key,
    label: `Open ${card.title}`,
    leading: pluginSymbol(card.icon),
    hidden: lines.length > 0,
    page: { title: card.title, children: tab ?? page },
  };

  const rows = [
    open,
    ...lines.slice(0, workbenchPreviewLimit).map(lineRow(open)),
    ...(more > 0 ? [moreRow(key, more, open)] : []),
  ];

  return { key, title: card.title, rows };
}
