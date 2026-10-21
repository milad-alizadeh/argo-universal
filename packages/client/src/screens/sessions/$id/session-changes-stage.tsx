import { useState, type ReactElement } from 'react';
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

type Props = { changes?: ChangesViewProps; header?: SessionHeaderProps };

const segments = [
  { value: 'change', label: 'Change' },
  { value: 'files', label: 'Files' },
];

function Files({ changes }: Props): ReactElement | null {
  return changes ? (
    <>
      <ChangesToolbar {...changes} />
      <ChangesFiles {...changes} />
    </>
  ) : null;
}

type ChangeProps = Props & { header: SessionHeaderProps };

function ChangePages({ header, ...props }: ChangeProps): ReactElement {
  const [segment, select] = useState('files');

  return (
    <Stack direction="column" gap={2}>
      <SegmentedControl
        label="Change detail"
        options={segments}
        value={segment}
        onValueChange={select}
      />
      <ChangePage {...props} header={header} segment={segment} />
    </Stack>
  );
}

function ChangePage(
  props: ChangeProps & { segment: string },
): ReactElement | null {
  return props.segment === 'change' ? (
    <SessionChangeDetail {...props.header} />
  ) : (
    <Files {...props} />
  );
}

const hasChange = (header: SessionHeaderProps): boolean =>
  !!header.pullRequests?.length;

// The approved Change detail keeps its stage, checks and closing action separate from Files.
export function SessionChangesStage({
  header,
  ...props
}: Props): ReactElement | null {
  if (!header) return <Files {...props} />;

  return hasChange(header) ? (
    <ChangePages {...props} header={header} />
  ) : (
    <Files {...props} />
  );
}
