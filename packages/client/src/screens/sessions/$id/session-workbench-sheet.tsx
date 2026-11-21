import type { ShellTerminal } from '@repo/contracts';
import { Sheet, useSheet } from '@repo/kit/primitives/overlays/sheet';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import {
  useEffect,
  useState,
  type ComponentProps,
  type ReactElement,
} from 'react';
import { agentsFacts } from './sections/agents-facts';
import { changesFacts } from './sections/changes-facts';
import { pluginCardKey } from './sections/plugin-card-section';
import { shellsFacts } from './sections/shells-facts';
import type { SessionInspectorContent } from './session-inspector-content';
import { changeRows, agentRows, taskRows } from './session-workbench-details';
import {
  workbenchRunGroup,
  workbenchRunPages,
  workbenchRunsKey,
} from './session-workbench-run-pages';
import {
  WorkbenchOverview,
  type WorkbenchGroup,
  type WorkbenchRow,
} from './session-workbench-sheet-rows';
import {
  workbenchShellPage,
  WorkbenchShellRuntime,
} from './session-workbench-shell-page';

interface WorkbenchSheetProps {
  content: SessionInspectorContent;
  open: boolean;
  initialShell?: ShellTerminal;
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
  initialShell,
  ...presentation
}: WorkbenchSheetProps): ReactElement {
  const groups = workbenchGroups(content);
  const [visited, setVisited] = useState<WorkbenchRow>();

  return (
    <WorkbenchShellRuntime value={content.runs}>
      <Sheet {...sheetFrame} {...presentation}>
        <Sheet.Screen name="workbench" title="Workbench">
          <WorkbenchOverview groups={groups} onVisit={setVisited} />
          {presentation.open && initialShell && (
            <OpenWorkbenchShell shell={initialShell} />
          )}
        </Sheet.Screen>
        {workbenchDetails(groups, visited)}
        {workbenchRunPages(content.runs)}
      </Sheet>
    </WorkbenchShellRuntime>
  );
}

function OpenWorkbenchShell({ shell }: { shell: ShellTerminal }): null {
  const { push } = useSheet();

  useEffect(() => {
    push(workbenchRunsKey);
    push(workbenchShellPage(shell));
  }, [push, shell]);

  return null;
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
    { ...changesFacts, rows: changeRows(content) },
    { ...agentsFacts, rows: agentRows(content) },
    { ...shellsFacts, rows: taskRows(content) },
    ...workbenchRunGroup(content.runs),
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
