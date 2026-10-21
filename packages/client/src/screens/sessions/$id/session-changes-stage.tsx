import { useState, type ComponentProps, type ReactElement } from 'react';
import {
  ChangesFiles,
  ChangesToolbar,
  type ChangesViewProps,
} from '#features/changes';
import {
  SessionChangeDetail,
  type SessionHeaderProps,
} from '#features/sessions';
import { SegmentedControl } from '#primitives/inputs/segmented-control';
import { Stack } from '#primitives/layout/stack';
import {
  InspectorBody,
  type InspectorProps,
} from '#primitives/scaffolds/inspector';

type Props = {
  changes?: ChangesViewProps;
  header?: SessionHeaderProps;
  scrollState?: InspectorProps['scrollState'];
};

type Page = Props & { segment: string; onSelect: (segment: string) => void };

const segments = [
  { value: 'change', label: 'Change' },
  { value: 'files', label: 'Files' },
];

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

function FilesToolbar(props: Page): ReactElement | null {
  if (props.segment !== 'files') return null;

  return props.changes ? <ChangesToolbar {...props.changes} /> : null;
}

function StageToolbar(props: Page): ReactElement {
  return (
    <Stack direction="column" gap={2}>
      {hasChange(props) && (
        <SegmentedControl
          label="Change detail"
          options={segments}
          value={props.segment}
          onValueChange={props.onSelect}
        />
      )}
      <FilesToolbar {...props} />
    </Stack>
  );
}

const pageScroll = (props: Page): InspectorProps['scrollState'] =>
  props.segment === 'files' ? props.scrollState : undefined;

function stageFrame(props: Page): ComponentProps<typeof InspectorBody> {
  return {
    title: 'Changes',
    open: true,
    onOpenChange: ignore,
    surface: 'bg-transparent',
    toolbar: <StageToolbar {...props} />,
    scrollState: pageScroll(props),
  };
}

// Segments and comparison belong above the scroller; each file page keeps its own position.
export function SessionChangesStage(props: Props): ReactElement {
  const [selected, onSelect] = useState('files');

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
