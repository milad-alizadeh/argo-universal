import type * as React from 'react';
import { useAddProject } from '#features/settings';
import { goBack } from '#lib/product/navigation/navigation';
import { useServerScope } from '#lib/product/server-scope';
import { ProjectNewView } from './project-new-view';

// Add a Project to the Server, then back to the Projects list, which now holds it.
export function ProjectNewScreen(): React.JSX.Element {
  const { adding, error, add } = useAddProject(goBack);

  const { serverDevice } = useServerScope();

  const chooseFolder = localFolderPicker(serverDevice);

  return (
    <ProjectNewView
      adding={adding}
      error={error}
      onSubmit={add}
      onCancel={goBack}
      onChooseFolder={chooseFolder}
    />
  );
}

// A local Mac path is never sent to a paired Server on another computer.
const localFolderPicker = (
  serverDevice: boolean,
): (() => Promise<string | null>) | undefined =>
  serverDevice ? desktopFolderPicker() : undefined;

const desktopFolderPicker = (): (() => Promise<string | null>) | undefined =>
  globalThis.window?.argo?.chooseProjectFolder;
