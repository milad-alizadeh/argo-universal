import { View } from 'react-native';
import { DiffView } from '../src/components/DiffView';
import { recordedFile } from './feed-edit-mock';

// Recorded changed files stacked as one list, the way the Inspector shows them.
export function InspectorFilesMock() {
  return (
    <View>
      {[
        recordedFile('agent-2', 'edit-states'),
        recordedFile('agent-1'),
        recordedFile('agent-1', 'edit-and-command', 'add'),
        recordedFile('agent-2', 'edit-states', 'delete'),
      ].map((file, index) => (
        <DiffView key={`${file.path}-${index}`} file={file} />
      ))}
    </View>
  );
}
