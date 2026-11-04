import {
  EmptyState,
  type Argo,
  type LoaderPage,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { FileMap } from './file-map';
import type { CodeFile } from './model';
import { projectFiles } from './project-files';
import { loadFiles } from './reading';

// The file the map has selected, by its rectangle's key, or none.
export type MapState = { selected: string };

// Git's files, or none when git could not read the Project.
type MapData = { files: CodeFile[] } | null;

const codeMap: LoaderPage<MapState, MapData> = {
  state: { selected: '' },
  load: async ({ read }) => {
    const reading = await loadFiles(read);

    return reading.state === 'ready'
      ? { files: projectFiles(reading.answers) }
      : null;
  },
  render: (data, to, { state }) => (
    <CodeMap data={data} selected={state.selected} to={to} />
  ),
};

// The Code Map's Loader page, drawn for the Project the page opened for.
export function defineCodeMap(argo: Argo, path: string): void {
  argo.pages.define(path, codeMap);
}

type MapProps = {
  data: MapData;
  selected: string;
  to: PageTo<MapState>;
};

// Draws the Project's files as a treemap once git has answered.
function CodeMap({ data, selected, to }: MapProps): JSX.Element {
  if (!data)
    return (
      <EmptyState
        title="Could not read this Project’s files."
        description="The Code Map needs the Project to be a git repository."
      />
    );

  if (data.files.length === 0)
    return (
      <EmptyState
        title="No text files yet"
        description="The Code Map draws the text files git tracks in this Project."
      />
    );

  return (
    <FileMap
      files={data.files}
      selected={selected}
      onSelect={(key) => to.set({ selected: key })}
    />
  );
}
