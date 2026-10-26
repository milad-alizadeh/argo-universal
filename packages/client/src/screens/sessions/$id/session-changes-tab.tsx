import { InspectorBody } from '@repo/kit/primitives/scaffolds/inspector';
import { useState, type ComponentProps, type ReactElement } from 'react';
import {
  ChangesFiles,
  ChangesInspectorToolbar,
  type ChangesViewProps,
  type InspectorSegment,
} from '#features/changes';
import {
  SessionChangeDetail,
  type SessionHeaderProps,
} from '#features/sessions';

type Props = {
  changesRequest?: number;
  changes?: ChangesViewProps;
  header?: SessionHeaderProps;
};

type Page = Props & {
  segment: InspectorSegment;
  onSelect: (segment: InspectorSegment) => void;
};

const hasChange = (props: Props): boolean =>
  !!props.header?.pullRequests?.length;

const ignore = (): void => {};

function Files({ changes }: Props): ReactElement | null {
  return changes ? <ChangesFiles {...changes} /> : null;
}

function ChangesContent(props: Page): ReactElement | null {
  if (props.segment === 'change' && props.header)
    return <SessionChangeDetail {...props.header} />;

  return <Files {...props} />;
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

function ChangesTabPage(props: Props): ReactElement {
  const [selected, onSelect] = useState<InspectorSegment>(
    props.changesRequest ? 'change' : 'files',
  );

  const page = {
    ...props,
    segment: hasChange(props) ? selected : 'files',
    onSelect,
  };

  return (
    <InspectorBody {...changesFrame(page)}>
      <ChangesContent {...page} />
    </InspectorBody>
  );
}
