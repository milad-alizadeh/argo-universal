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
import type { ChangeFilesSource } from '../../plugins/change-files';
import { SessionChangeFiles } from './session-change-files';

type Props = {
  changesRequest?: number;
  changes?: ChangesViewProps;
  header?: SessionHeaderProps;
  // Which Change shows in full; the tab keeps its own where the Session supplies none.
  selection?: ChangeSelection;
  actions?: ChangeActions;
  // Where the selected Change's own files are read from; without it a selected Change shows none, never the Checkout's.
  changeFiles?: ChangeFilesSource;
};

type Page = Props & {
  selection: ChangeSelection;
  segment: InspectorSegment;
  onSelect: (segment: InspectorSegment) => void;
};

const changesOf = (props: Props): readonly SessionPullRequest[] =>
  props.header?.pullRequests ?? [];

// With none attached, the Change segment is still offered where the Session can find or attach one.
const hasChange = (props: Props): boolean =>
  changesOf(props).length > 0 || props.actions !== undefined;

const ignore = (): void => {};

function Files({ changes }: Props): ReactElement | null {
  return changes ? <ChangesFiles {...changes} /> : null;
}

// The selected Change's own files, against its own base and head; the Checkout's are the list's, not a Change's.
function ChangeFiles(props: Page): ReactElement | null {
  const { selected } = props.selection;

  if (!selected || !props.changeFiles) return null;

  return (
    <SessionChangeFiles
      change={selected}
      source={props.changeFiles(selected)}
    />
  );
}

const detachOf = (
  actions: ChangeActions | undefined,
): ComponentProps<typeof SessionChangeDetail>['onDetach'] =>
  actions && ((change) => void actions.detach(change));

const refreshOf = (
  actions: ChangeActions | undefined,
): (() => void) | undefined => actions && (() => void actions.refresh());

function List(props: Page): ReactElement {
  return (
    <SessionChangeList
      changes={changesOf(props)}
      onSelect={props.selection.select}
      actions={props.actions}
    />
  );
}

// The full list of Changes, or the one the Session has selected, with Back to the list.
function Changes(props: Page): ReactElement {
  const { selected, back } = props.selection;

  if (!selected) return <List {...props} />;

  return (
    <SessionChangeDetail
      change={selected}
      onBack={back}
      onDetach={detachOf(props.actions)}
      onRefresh={refreshOf(props.actions)}
      onSignIn={props.actions?.signIn}
    />
  );
}

function ChangesContent(props: Page): ReactElement | null {
  if (props.segment === 'change') return <Changes {...props} />;

  return props.selection.selected ? (
    <ChangeFiles {...props} />
  ) : (
    <Files {...props} />
  );
}

const changesToolbar = (props: Page): ReactElement => (
  <ChangesInspectorToolbar
    hasChange={hasChange(props)}
    segment={props.segment}
    onSelect={props.onSelect}
    changes={props.selection.selected ? undefined : props.changes}
  />
);

function changesFrame(props: Page): ComponentProps<typeof InspectorBody> {
  return {
    title: 'Changes',
    open: true,
    onOpenChange: ignore,
    surface: 'bg-transparent',
    toolbar: changesToolbar(props),
    // The files and the Changes list are their own virtualised lists; one Change's detail scrolls in the Inspector's.
    contentScrolls: props.segment === 'files' || !props.selection.selected,
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
