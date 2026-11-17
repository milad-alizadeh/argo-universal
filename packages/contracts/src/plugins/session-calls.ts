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

// `argo.sessions.archive`; needs `sessions:archive` and a Session of the Project the call runs for, and is refused while a Turn runs or the Checkout has uncommitted files (ADR-0055).
export const SessionArchive = z.object({
  api: z.literal('sessions'),
  action: z.literal('archive'),
  sessionId: z.string().min(1),
});

// `argo.sessions.prompt` sends the Plugin's text as a Prompt; needs `sessions:prompt` (ADR-0055).
export const SessionPrompt = z.object({
  api: z.literal('sessions'),
  action: z.literal('prompt'),
  sessionId: z.string().min(1),
  text: z.string().min(1),
});

// `argo.sessions.withdraw` takes back a Queued Prompt this Plugin sent; needs `sessions:prompt` (ADR-0055).
export const SessionWithdraw = z.object({
  api: z.literal('sessions'),
  action: z.literal('withdraw'),
  sessionId: z.string().min(1),
  queuedId: z.string().min(1),
});

export const SessionCall = z.discriminatedUnion('action', [
  SessionGet,
  SessionArchive,
  SessionPrompt,
  SessionWithdraw,
]);

// Whether the Prompt started a Turn now, or waits in the Session's queue behind the work already there, by the id `withdraw` takes.
export const PluginPromptAnswer = z.discriminatedUnion('status', [
  z.object({ status: z.literal('started') }),
  z.object({ status: z.literal('queued'), queuedId: z.string().min(1) }),
]);

export type PluginPromptAnswer = z.infer<typeof PluginPromptAnswer>;

// Whether the Prompt was taken back; false when it started, is gone, or the person is editing it.
export const PluginWithdrawAnswer = z.object({ withdrawn: z.boolean() });

export type PluginWithdrawAnswer = z.infer<typeof PluginWithdrawAnswer>;
