import { z } from 'zod';

// What `argo.projects.list` tells a Plugin about each Project.
export const PluginProjectInfo = z.object({
  id: z.string(),
  name: z.string(),
  originUrl: z.string().nullable(),
});

export type PluginProjectInfo = z.infer<typeof PluginProjectInfo>;

// What `argo.sessions.get` tells a Plugin about one Session; `branch` is null while its checkout has none.
export const PluginSessionInfo = z.object({
  projectId: z.string(),
  branch: z.string().nullable(),
  // The Session's own title, so a Plugin's page can name a Session it points at.
  title: z.string(),
});

export type PluginSessionInfo = z.infer<typeof PluginSessionInfo>;

export const SessionGet = z.object({
  api: z.literal('sessions'),
  action: z.literal('get'),
  sessionId: z.string().min(1),
});

// `argo.sessions.archive`; needs `sessions:archive` and a Session of the Project the call runs for (ADR-0055).
export const SessionArchive = z.object({
  api: z.literal('sessions'),
  action: z.literal('archive'),
  sessionId: z.string().min(1),
});

export const SessionCall = z.discriminatedUnion('action', [
  SessionGet,
  SessionArchive,
]);
