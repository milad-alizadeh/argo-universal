import type { ShellTerminal } from '@repo/contracts';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { Sheet, useSheet } from '@repo/kit/primitives/overlays/sheet';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactElement,
} from 'react';
import { pluginCardLines } from './sections/plugin-card-rows';
import type { SessionPluginCard } from './sections/plugin-card-section';
import type { SessionInspectorContent } from './session-inspector-content';
import { type CardLines, workbenchGroups } from './session-workbench-groups';
import {
  workbenchRunPages,
  workbenchRunsKey,
  workbenchRunsPage,
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

const noCards: readonly SessionPluginCard[] = [];

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
  const [visited, setVisited] = useState<WorkbenchRow>();
  const cardLines = usePluginCardLines(content.pluginCards ?? noCards);
  const groups = workbenchGroups(content, { cardLines, onVisit: setVisited });

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
        {workbenchRunsPage(content.runs)}
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

// Each held tree gets a number once, so the sheet's snapshot of its cards' trees is a string that changes only with them.
const treeNumbers = new WeakMap<WireNode, number>();

let nextTreeNumber = 0;

function treeNumber(tree: WireNode | null): number {
  if (!tree) return -1;

  const known = treeNumbers.get(tree);

  if (known !== undefined) return known;

  treeNumbers.set(tree, nextTreeNumber);

  return nextTreeNumber++;
}

const readTree = (card: SessionPluginCard): WireNode | null =>
  card.tree?.read() ?? null;

/*
 * The lines each open Plugin card's page shows, current with the page. It reads the cards' trees outside React,
 * so the compiler must not keep an earlier answer.
 */
function usePluginCardLines(cards: readonly SessionPluginCard[]): CardLines {
  'use no memo';

  const subscribe = useCallback(
    (listener: () => void): (() => void) => {
      const stops = cards.flatMap((card) =>
        card.tree ? [card.tree.subscribe(listener)] : [],
      );

      return () => stops.forEach((stop) => stop());
    },
    [cards],
  );

  useSyncExternalStore(subscribe, () =>
    cards.map((card) => treeNumber(readTree(card))).join(','),
  );

  return (card) => pluginCardLines(readTree(card));
}
