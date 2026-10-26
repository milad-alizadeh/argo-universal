import { SegmentedControl } from '@repo/kit/primitives/controls/segmented-control';
import { Stack } from '@repo/kit/primitives/layout/stack';
import type * as React from 'react';
import type { ChangesViewProps } from '../../view/changes-view-props';
import { ChangesToolbar } from '../changes-toolbar/changes-toolbar';

export type InspectorSegment = 'change' | 'files';

const segments: { value: InspectorSegment; label: string }[] = [
  { value: 'change', label: 'Change' },
  { value: 'files', label: 'Files' },
];

// The control reports a segment's value as a string; only a value the toolbar offers is passed on.
const selecting =
  (onSelect: (segment: InspectorSegment) => void) =>
  (value: string): void => {
    const picked = segments.find((segment) => segment.value === value);

    if (picked) onSelect(picked.value);
  };

export interface ChangesInspectorToolbarProps {
  // Only a Session with a pull request has a Change to switch to.
  hasChange: boolean;
  segment: InspectorSegment;
  onSelect: (segment: InspectorSegment) => void;
  changes?: ChangesViewProps;
}

function FilesToolbar(
  props: ChangesInspectorToolbarProps,
): React.JSX.Element | null {
  if (props.segment !== 'files') return null;

  return props.changes ? <ChangesToolbar {...props.changes} /> : null;
}

function Segments(
  props: ChangesInspectorToolbarProps,
): React.JSX.Element | null {
  if (!props.hasChange) return null;

  return (
    <SegmentedControl
      label="Change detail"
      options={segments}
      value={props.segment}
      onValueChange={selecting(props.onSelect)}
    />
  );
}

// Above the Inspector's scroller: the Change and Files segments, and under Files the comparison.
export function ChangesInspectorToolbar(
  props: ChangesInspectorToolbarProps,
): React.JSX.Element {
  return (
    <Stack direction="column" gap={2}>
      <Segments {...props} />
      <FilesToolbar {...props} />
    </Stack>
  );
}
