import { useRouter } from 'expo-router';
import type * as React from 'react';
import { useAddProject } from '#features/settings';
import { AddProjectView } from './add-project-view';

// Add a Project to the Server, then back to the Projects list, which now holds it.
export function AddProjectScreen(): React.JSX.Element {
  const router = useRouter();
  const { adding, add } = useAddProject(() => router.back());

  return <AddProjectView adding={adding} onSubmit={add} />;
}
