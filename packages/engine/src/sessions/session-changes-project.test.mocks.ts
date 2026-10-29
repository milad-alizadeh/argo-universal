import type { startAcpEngine } from '#mocks/acp-engine';

export type Host = Awaited<ReturnType<typeof startAcpEngine>>;

export async function projectPath(host: Host): Promise<string> {
  const project = (await host.caller.project.list()).find(
    ({ id }) => id === 'project-1',
  );

  if (!project) throw new Error('No Project');

  return project.path;
}
