import { InspectorBody } from '@repo/kit/primitives/scaffolds/inspector';
import { useState, type ComponentProps, type ReactElement } from 'react';
import {
  ChangesFiles,
  ChangesInspectorToolbar,
  type ChangesViewProps,
  type InspectorSegment,
} from '#features/changes';
import {
  type ChangeActions,
  type ChangeSelection,
  SessionChangeDetail,
  SessionChangeList,
  type SessionHeaderProps,
  type SessionPullRequest,
  useChangeSelection,
} from '#features/sessions';

type Props = {
  changesRequest?: number;
  changes?: ChangesViewProps;
  header?: SessionHeaderProps;
  // Which Change shows in full; the tab keeps its own where the Session supplies none.
  selection?: ChangeSelection;
  actions?: ChangeActions;
};

type Page = Props & {
  selection: ChangeSelection;
  segment: InspectorSegment;
  onSelect: (segment: InspectorSegment) => void;
};

const changesOf = (props: Props): readonly SessionPullRequest[] =>
  props.header?.pullRequests ?? [];

const hasChange = (props: Props): boolean => changesOf(props).length > 0;

const ignore = (): void => {};

function Files({ changes }: Props): ReactElement | null {
  return changes ? <ChangesFiles {...changes} /> : null;
}

const detachOf = (
  actions: ChangeActions | undefined,
): ComponentProps<typeof SessionChangeDetail>['onDetach'] =>
  actions && ((change) => void actions.detach(change));

// The full list of Changes, or the one the Session has selected, with Back to the list.
function Changes(props: Page): ReactElement {
  const { selected, back, select } = props.selection;

  if (!selected)
    return <SessionChangeList changes={changesOf(props)} onSelect={select} />;

  return (
    <SessionChangeDetail
      change={selected}
      onBack={back}
      onDetach={detachOf(props.actions)}
    />
  );
}

function ChangesContent(props: Page): ReactElement | null {
  return props.segment === 'change' ? (
    <Changes {...props} />
  ) : (
    <Files {...props} />
  );
}

const changesToolbar = (props: Page): ReactElement => (
  <ChangesInspectorToolbar
    hasChange={hasChange(props)}
    segment={props.segment}
    onSelect={props.onSelect}
    changes={props.changes}
  />
);

function changesFrame(props: Page): ComponentProps<typeof InspectorBody> {
  return {
    title: 'Changes',
    open: true,
    onOpenChange: ignore,
    surface: 'bg-transparent',
    toolbar: changesToolbar(props),
    // The files are their own virtualised list; the change detail scrolls in the Inspector's.
    contentScrolls: props.segment === 'files',
  };
}

// Segments and comparison stay above the scroller.
export function SessionChangesTab(props: Props): ReactElement {
  return <ChangesTabPage key={props.changesRequest} {...props} />;
}

// A Session with no Change has only its files; asked to start over, the tab opens on the Changes.
function useSegment(props: Props): Pick<Page, 'segment' | 'onSelect'> {
  const [selected, onSelect] = useState<InspectorSegment>(
    props.changesRequest ? 'change' : 'files',
  );

  return { segment: hasChange(props) ? selected : 'files', onSelect };
}

function ChangesTabPage(props: Props): ReactElement {
  const own = useChangeSelection(changesOf(props));
  const segment = useSegment(props);
  const page = { ...props, ...segment, selection: props.selection ?? own };

  return (
    <InspectorBody {...changesFrame(page)}>
      <ChangesContent {...page} />
    </InspectorBody>
  );
}
