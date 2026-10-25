import { Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { mapNotes } from './notes';
import type { FileAnswers } from './project-files';
import type { DrawnFiles } from './scene';

// The notes under the map, one muted line each.
export function MapNotes(props: {
  drawn: DrawnFiles;
  answers: FileAnswers;
}): JSX.Element {
  return (
    <Stack direction="column" gap={1}>
      {mapNotes(props.drawn, props.answers).map((note) => (
        <Text key={note} role="secondary" tone="muted">
          {note}
        </Text>
      ))}
    </Stack>
  );
}
