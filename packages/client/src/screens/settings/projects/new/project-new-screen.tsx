import type * as React from 'react';
import { useAddProject } from '#features/settings';
import { goBack } from '#lib/product/navigation/navigation';
import { ProjectNewView } from './project-new-view';

// Add a Project to the Server, then back to the Projects list, which now holds it.
export function ProjectNewScreen(): React.JSX.Element {
  const { adding, add } = useAddProject(goBack);

  return <ProjectNewView adding={adding} onSubmit={add} />;
}
