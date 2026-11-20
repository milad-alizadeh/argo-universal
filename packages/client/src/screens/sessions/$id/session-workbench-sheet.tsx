import { Sheet } from '@repo/kit/primitives/overlays/sheet';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { useState, type ComponentProps, type ReactElement } from 'react';
import { pluginCardKey } from './sections/plugin-card-section';
import type { SessionInspectorContent } from './session-inspector-content';
import { changeRows, agentRows, taskRows } from './session-workbench-details';
import {
  WorkbenchOverview,
  type WorkbenchGroup,
  type WorkbenchRow,
} from './session-workbench-sheet-rows';

interface WorkbenchSheetProps {
  content: SessionInspectorContent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sheetFrame = {
  label: 'Workbench',
  detents: ['medium', 'large'],
  bottomEdge: true,
  contentScrolls: true,
} satisfies Pick<
  ComponentProps<typeof Sheet>,
  'label' | 'detents' | 'bottomEdge' | 'contentScrolls'
>;

export function SessionWorkbenchSheet({
  content,
  ...presentation
}: WorkbenchSheetProps): ReactElement {
  const groups = workbenchGroups(content);
  const [visited, setVisited] = useState<WorkbenchRow>();

  return (
    <Sheet {...sheetFrame} {...presentation}>
      <Sheet.Screen name="workbench" title="Workbench">
        <WorkbenchOverview groups={groups} onVisit={setVisited} />
      </Sheet.Screen>
      {workbenchDetails(groups, visited)}
    </Sheet>
  );
}

// A live item can disappear while its detail is open, for example after detaching a pull request.
function workbenchDetails(
  groups: readonly WorkbenchGroup[],
  visited?: WorkbenchRow,
): ReactElement[] {
  const rows = groups.flatMap((group) => group.rows);
  const pages = rows.flatMap(detailScreen);

  if (!visited || rows.some((row) => row.key === visited.key)) return pages;

  return [...pages, ...detailScreen(unavailable(visited))];
}

function unavailable(row: WorkbenchRow): WorkbenchRow {
  return {
    ...row,
    page: {
      title: row.page?.title,
      onExit: row.page?.onExit,
      children: (
        <EmptyState icon="workbench" title="This item is no longer available" />
      ),
    },
  };
}

const detailScreen = ({ key, page }: WorkbenchRow): ReactElement[] =>
  page ? [<Sheet.Screen key={key} name={key} {...page} />] : [];

function workbenchGroups(content: SessionInspectorContent): WorkbenchGroup[] {
  const groups = [
    { key: 'changes', title: 'Changes', rows: changeRows(content) },
    { key: 'subagents', title: 'Agents', rows: agentRows(content) },
    { key: 'shells', title: 'Background Tasks', rows: taskRows(content) },
  ];

  return [...groups, ...(content.pluginCards ?? []).map(pluginGroup)].filter(
    ({ rows }) => rows.length > 0,
  );
}

type PluginCard = NonNullable<SessionInspectorContent['pluginCards']>[number];

function pluginGroup({
  pluginId,
  card,
  page,
  tab,
}: PluginCard): WorkbenchGroup {
  const key = pluginCardKey(pluginId, card.id);

  const row = {
    key,
    label: `Open ${card.title}`,
    page: { title: card.title, children: tab ?? page },
  };

  return { key, title: card.title, rows: [row] };
}
