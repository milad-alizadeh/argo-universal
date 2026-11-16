import { type JSX, useState } from 'react';
import { View } from 'react-native';
import { type ChangesViewProps, useChanges } from '#features/changes';
import { type SessionHeaderProps, useSessionPanels } from '#features/sessions';
import { recordedFile } from '../../../../mocks/feed-edit-mock';
import {
  type MemoryCatalog,
  memoryChanges,
} from '../../../features/changes/source/memory-changes.mocks';
import { SessionInspector } from './session-inspector';

// Recorded edits: a long modified file, a short one and an added one.
const files = [
  recordedFile('agent-2', 'edit-states'),
  { ...recordedFile('agent-1'), path: '/repo/src/feed.ts' },
  {
    ...recordedFile('agent-1', 'edit-and-command', 'add'),
    path: '/repo/src/new-file.ts',
  },
];

export const changedFiles: MemoryCatalog = {
  files: () => files,
  mainBranch: 'main',
  branches: ['main'],
};

interface Props {
  catalog: MemoryCatalog;
  header?: SessionHeaderProps;
}

const noRevision = {};

function useSheetChanges(
  catalog: MemoryCatalog,
  open: boolean,
): ChangesViewProps {
  const [source] = useState(() => memoryChanges(catalog));

  return useChanges(
    { sessionId: 'memory-session', open, revision: noRevision },
    source,
  );
}

// The panels with the Changes tab already shown.
function useShownPanels(): ReturnType<typeof useSessionPanels> {
  const panels = useSessionPanels(['changes']);
  const [shown, setShown] = useState(false);

  if (!shown) {
    panels.select('changes');
    setShown(true);
  }

  return panels;
}

// The Session's Inspector with its Changes tab shown: the sheet on a phone.
export function ChangesSheet(props: Props): JSX.Element {
  const panels = useShownPanels();
  const open = panels.state.shown === 'changes';
  const changes = useSheetChanges(props.catalog, open);

  return (
    <View className="h-175 w-full flex-row">
      <SessionInspector
        panels={panels}
        changes={changes}
        header={props.header}
      />
    </View>
  );
}
