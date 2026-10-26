import {
  Inspector,
  type InspectorProps,
  type InspectorTab,
} from '@repo/kit/primitives/scaffolds/inspector';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type { ReactNode } from 'react';
import { createElement, type JSX } from 'react';
import {
  useChangesStage,
  ChangesSheetHeader,
  ChangesFiles,
} from '#features/changes';
import {
  type SessionPanel,
  sessionPanelLabels,
  sessionPanelOrder,
  offeredWorkPanels,
  type SessionPanels,
} from '#features/sessions';
import {
  panelContent,
  type SessionInspectorContent,
} from './session-inspector-content';
import { RetainedInspectorPages } from './session-inspector-pages';

export type { SessionInspectorContent } from './session-inspector-content';

export const offeredSessionPanels = (
  content: SessionInspectorContent,
): SessionPanel[] =>
  offeredWorkPanels({
    shells: content.shells?.shells,
    subagents: content.subagents?.subagents,
  });

const tabOf = (
  panel: SessionPanel,
  content: SessionInspectorContent,
): InspectorTab => {
  const { count, countTone } = panelContent[panel](content) ?? {};

  return { key: panel, ...sessionPanelLabels[panel], count, countTone };
};

type SessionInspectorProps = SessionInspectorContent & {
  panels: SessionPanels;
};

function onPanel(run: (panel: SessionPanel) => void): (key: string) => void {
  return (key) => {
    const panel = sessionPanelOrder.find((one) => one === key);

    if (panel) run(panel);
  };
}

function inspectorTabs({
  panels,
  ...content
}: SessionInspectorProps): InspectorProps['tabs'] {
  return {
    items: panels.state.tabs.map((panel) => tabOf(panel, content)),
    selected: panels.state.shown ?? '',
    onSelect: onPanel(panels.select),
    onClose: onPanel(panels.close),
  };
}

function inspectorProps(props: SessionInspectorProps): InspectorProps {
  const { tabs, shown } = props.panels.state;

  return {
    title: panelTitle(shown),
    open: tabs.length > 0,
    onOpenChange: (open) => !open && props.panels.closeAll(),
    tabs: inspectorTabs(props),
    sheetHeader: changesSheetHeader(props),
  };
}

const panelTitle = (shown: SessionPanel | undefined): string =>
  shown ? sessionPanelLabels[shown].label : '';

function changesSheetHeader(props: SessionInspectorProps): ReactNode {
  if (hasChange(props)) return undefined;

  return props.panels.state.shown === 'changes'
    ? createElement(ChangesSheetHeader)
    : undefined;
}

// Subagents and Shells have their own phone sheets, so their tabs are the wide window's alone.
const phonePanels = new Set<SessionPanel | undefined>(['subagents', 'shells']);

// The Session's Inspector: a tab for each panel opened from the header, showing one at a time.
export function SessionInspector(
  props: SessionInspectorProps,
): JSX.Element | null {
  const stage = useChangesStage(props.changes);
  const content = { ...props, changes: stage.changes };
  const inspector = renderInspector(content, stage);

  return (
    <SizeClass
      compact={
        phonePanels.has(props.panels.state.shown) ? null : phoneInspector(props)
      }
      wide={inspector}
    />
  );
}

function phoneInspector(props: SessionInspectorProps): JSX.Element {
  return createElement(
    Inspector,
    {
      ...inspectorProps(props),
      sheetHeader: createElement(ChangesSheetHeader),
    },
    props.changes && createElement(ChangesFiles, props.changes),
  );
}

// Open tabs retain their actual content trees, including virtualised detail scroll and local selection.
function renderInspector(
  content: SessionInspectorProps,
  stage: ReturnType<typeof useChangesStage>,
): JSX.Element {
  return createElement(
    Inspector,
    { ...inspectorProps(content), toolbar: undefined, contentScrolls: true },
    <RetainedInspectorPages
      {...content}
      changesRequest={content.panels.state.changesRequest}
      inspector={inspectorProps(content)}
      scrollState={stage.scrollState}
    />,
  );
}

const hasChange = (props: SessionInspectorContent): boolean =>
  !!props.header?.pullRequests?.length;
