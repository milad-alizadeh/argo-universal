// A Project's page is addressed by its name; a Screen link also gives its id, which then decides.
export function selectProject<Project extends { id: string; name: string }>(
  projects: readonly Project[],
  name: string,
  projectId?: string,
): Project | undefined {
  return projectId === undefined
    ? projects.find((entry) => entry.name === name)
    : projects.find((entry) => entry.id === projectId);
}
