import { useRouter } from 'expo-router';
import type * as React from 'react';
import { useAddProject } from '#features/settings';
import { ProjectNewView } from './project-new-view';

// Add a Project to the Server, then back to the Projects list, which now holds it.
export function ProjectNewScreen(): React.JSX.Element {
  const router = useRouter();
  const { adding, add } = useAddProject(() => router.back());

  return <ProjectNewView adding={adding} onSubmit={add} />;
}
