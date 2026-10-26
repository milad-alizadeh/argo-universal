import type { ReactElement } from 'react';
import { ControlHost } from '#primitives/native/native-control';
import { SegmentedControlDrawing } from './segmented-control-drawing';
import type { SegmentedControlProps } from './segmented-control-props';

export function SegmentedControl(props: SegmentedControlProps): ReactElement {
  return (
    <ControlHost matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <SegmentedControlDrawing {...props} />
    </ControlHost>
  );
}
