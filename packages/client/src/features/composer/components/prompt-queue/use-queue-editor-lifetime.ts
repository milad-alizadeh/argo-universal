import { useLayoutEffect, useState } from 'react';
import { editorLifetime, type EditorLifetime } from './queue-editor-lifetime';
import type { PromptQueueProps } from './queue-types';

export function useQueueEditorLifetime(
  command: PromptQueueProps['command'],
): EditorLifetime {
  const [lifetime] = useState(() => editorLifetime(command));

  useLayoutEffect(() => lifetime.updateCommand(command), [lifetime, command]);

  return lifetime;
}
