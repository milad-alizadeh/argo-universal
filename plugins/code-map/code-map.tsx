import { EmptyState, Text, useData, useMemo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { FileMap } from './file-map';
import { fileQueries, projectFiles } from './project-files';
import { readFiles, type Answer, type Reading } from './reading';

// One Query's answer, kept the same object while it holds the same data.
function useAnswer(
  query: (typeof fileQueries)[keyof typeof fileQueries],
): Answer {
  const { data, error } = useData(query);

  return useMemo(() => ({ data, error }), [data, error]);
}

// The map's page belongs to the Project its row drilled in from, so each Query runs in that folder.
function useReading(): Reading {
  const lines = useAnswer(fileQueries.lines);
  const branches = useAnswer(fileQueries.branches);
  const touches = useAnswer(fileQueries.touches);

  return useMemo(
    () => readFiles({ lines, branches, touches }),
    [lines, branches, touches],
  );
}

// Waits for git's answers, then draws the Project's files as a treemap.
export function CodeMap(): JSX.Element {
  const reading = useReading();

  if (reading.state === 'failed')
    return (
      <EmptyState
        title="Could not read this Project’s files."
        description="The Code Map needs the Project to be a git repository."
      />
    );

  if (reading.state === 'loading')
    return <Text tone="muted">Reading this Project’s files…</Text>;

  return <ProjectMap reading={reading} />;
}

type ReadyReading = Extract<Reading, { state: 'ready' }>;

function ProjectMap({ reading }: { reading: ReadyReading }): JSX.Element {
  const files = useMemo(() => projectFiles(reading.answers), [reading]);

  if (files.length === 0)
    return (
      <EmptyState
        title="No text files yet"
        description="The Code Map draws the text files git tracks in this Project."
      />
    );

  return <FileMap files={files} />;
}
