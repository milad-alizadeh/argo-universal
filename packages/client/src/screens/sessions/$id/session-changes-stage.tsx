import { InspectorBody } from '@repo/kit/primitives/scaffolds/inspector';
import { useState, type ComponentProps, type ReactElement } from 'react';
import {
  ChangesFiles,
  ChangesStageToolbar,
  type ChangesViewProps,
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

type Page = Props & { segment: string; onSelect: (segment: string) => void };

const hasChange = (props: Props): boolean =>
  !!props.header?.pullRequests?.length;

const ignore = (): void => {};

function Files({ changes }: Props): ReactElement | null {
  return changes ? <ChangesFiles {...changes} /> : null;
}

function StageContent(props: Page): ReactElement | null {
  if (props.segment === 'change' && props.header)
    return <SessionChangeDetail {...props.header} />;

  return <Files {...props} />;
}

const stageToolbar = (props: Page): ReactElement => (
  <ChangesStageToolbar
    hasChange={hasChange(props)}
    segment={props.segment}
    onSelect={props.onSelect}
    changes={props.changes}
  />
);

function stageFrame(props: Page): ComponentProps<typeof InspectorBody> {
  return {
    title: 'Changes',
    open: true,
    onOpenChange: ignore,
    surface: 'bg-transparent',
    toolbar: stageToolbar(props),
    // The files are their own virtualised list; the change detail scrolls in the Inspector's.
    contentScrolls: props.segment === 'files',
  };
}

// Segments and comparison stay above the scroller.
export function SessionChangesStage(props: Props): ReactElement {
  return <ChangesStagePage key={props.changesRequest} {...props} />;
}

function ChangesStagePage(props: Props): ReactElement {
  const [selected, onSelect] = useState(
    props.changesRequest ? 'change' : 'files',
  );

  const page = {
    ...props,
    segment: hasChange(props) ? selected : 'files',
    onSelect,
  };

  return (
    <InspectorBody {...stageFrame(page)}>
      <StageContent {...page} />
    </InspectorBody>
  );
}
