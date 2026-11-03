import { z } from 'zod';

// `argo.fs`: what a Plugin's file calls send to the Server, and what the Server answers.
export const FsWrite = z.object({
  action: z.literal('write'),
  path: z.string(),
  content: z.string(),
});

export const FsCall = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), path: z.string() }),
  FsWrite,
  z.object({ action: z.literal('list'), path: z.string() }),
  z.object({ action: z.literal('stat'), path: z.string() }),
]);

export type FsCall = z.infer<typeof FsCall>;

export const PluginFileKind = z.enum(['directory', 'file']);

export const PluginFileEntry = z.object({
  name: z.string(),
  kind: PluginFileKind,
});

export const PluginFileInfo = z.object({
  kind: PluginFileKind,
  size: z.number(),
  modified: z.number(),
});
