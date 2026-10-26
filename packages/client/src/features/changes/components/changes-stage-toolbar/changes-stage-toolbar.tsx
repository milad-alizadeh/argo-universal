import { SegmentedControl } from '@repo/kit/primitives/controls/segmented-control';
import { Stack } from '@repo/kit/primitives/layout/stack';
import type * as React from 'react';
import type { ChangesViewProps } from '../../view/changes-view-props';
import { ChangesToolbar } from '../changes-toolbar/changes-toolbar';

export type StageSegment = 'change' | 'files';

const segments = [
  { value: 'change', label: 'Change' },
  { value: 'files', label: 'Files' },
];

export interface ChangesStageToolbarProps {
  // Only a Session with a pull request has a Change to switch to.
  hasChange: boolean;
  segment: string;
  onSelect: (segment: string) => void;
  changes?: ChangesViewProps;
}

function FilesToolbar(
  props: ChangesStageToolbarProps,
): React.JSX.Element | null {
  if (props.segment !== 'files') return null;

  return props.changes ? <ChangesToolbar {...props.changes} /> : null;
}

function Segments(props: ChangesStageToolbarProps): React.JSX.Element | null {
  if (!props.hasChange) return null;

  return (
    <SegmentedControl
      label="Change detail"
      options={segments}
      value={props.segment}
      onValueChange={props.onSelect}
    />
  );
}

// Above the Stage's scroller: the Change and Files segments, and under Files the comparison.
export function ChangesStageToolbar(
  props: ChangesStageToolbarProps,
): React.JSX.Element {
  return (
    <Stack direction="column" gap={2}>
      <Segments {...props} />
      <FilesToolbar {...props} />
    </Stack>
  );
}
