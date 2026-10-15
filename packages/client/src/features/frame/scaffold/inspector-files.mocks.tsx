import type * as React from 'react';
import { View } from 'react-native';
import { DiffView } from '#features/feed';
import { recordedFile } from '../../../../mocks/feed-edit-mock';
import { withOccurrenceKeys } from '../../../lib/generic/occurrence-keys';

function recordedFiles(): ReturnType<typeof recordedFile>[] {
  return [
    recordedFile('agent-2', 'edit-states'),
    recordedFile('agent-1'),
    recordedFile('agent-1', 'edit-and-command', 'add'),
    recordedFile('agent-2', 'edit-states', 'delete'),
  ];
}

// Recorded changed files stacked as one list, the way the Inspector shows them.
export function InspectorFilesMock(): React.JSX.Element {
  return (
    <View>
      {withOccurrenceKeys(recordedFiles(), (file) => file.path).map(
        ({ item: file, key }) => (
          <DiffView key={key} file={file} />
        ),
      )}
    </View>
  );
}
